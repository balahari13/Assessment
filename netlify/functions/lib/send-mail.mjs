/** Transactional email. Prefer Resend or Gmail; FormSubmit only as last resort. */
export const MAIL_FROM = process.env.MAIL_FROM
    || process.env.GOOGLE_MEET_ORGANIZER
    || 'balahari13@gmail.com';
/** FormSubmit is activated on the public contact inbox — not the staff admin login email. */
export const SITE_INBOX = process.env.OTP_MAIL_INBOX || 'info@trinitasnxt.in';

function toBase64Url(str) {
    return Buffer.from(str, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function siteOrigin(requestOrigin) {
    const allowed = new Set([
        'https://trinitasnxt.in',
        'https://www.trinitasnxt.in'
    ]);
    if (requestOrigin && allowed.has(requestOrigin)) return requestOrigin;
    const envUrl = String(process.env.URL || process.env.SITE_URL || 'https://trinitasnxt.in').replace(/\/$/, '');
    if (allowed.has(envUrl)) return envUrl;
    return 'https://trinitasnxt.in';
}

async function tryResend({ to, subject, text, html }) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, reason: 'not_configured' };
    const from = process.env.RESEND_FROM || `Trinitas NextGen <${MAIL_FROM}>`;
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from,
                to: [to],
                subject,
                text,
                html: html || undefined
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, reason: 'resend_failed', detail: data };
        return { ok: true, via: 'resend' };
    } catch (err) {
        return { ok: false, reason: 'resend_error', detail: String(err.message || err) };
    }
}

async function googleAccessToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) return null;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    return tokenData.access_token || null;
}

async function tryGmail({ to, subject, text }) {
    const access = await googleAccessToken();
    if (!access) return { ok: false, reason: 'not_configured' };
    const from = MAIL_FROM;
    const raw = [
        `From: Trinitas NextGen <${from}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        text
    ].join('\r\n');
    try {
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${access}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: toBase64Url(raw) })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, reason: 'gmail_failed', detail: data };
        return { ok: true, via: 'gmail' };
    } catch (err) {
        return { ok: false, reason: 'gmail_error', detail: String(err.message || err) };
    }
}

/**
 * FormSubmit rejects posts that look like local files unless Origin/Referer are a live site.
 * Post to the activated inbox and auto-respond to the candidate (email field).
 */
async function tryFormSubmitAutoresponse({ to, subject, text, fullName, origin }) {
    const inbox = SITE_INBOX;
    const site = siteOrigin(origin);
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: site,
        Referer: `${site}/careers.html`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };
    const body = {
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        _autoresponse: text,
        _cc: to,
        name: fullName || 'Candidate',
        email: to,
        message: text
    };
    try {
        const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(inbox)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        const ok = res.ok && data.success !== false && String(data.success).toLowerCase() !== 'false';
        if (ok) return { ok: true, via: 'formsubmit' };
        return { ok: false, reason: 'formsubmit_failed', detail: data, status: res.status };
    } catch (err) {
        return { ok: false, reason: 'formsubmit_error', detail: String(err.message || err) };
    }
}

export async function sendTransactionalEmail({ to, subject, text, html, fullName, origin }) {
    const dest = String(to || '').trim();
    if (!dest.includes('@')) return { ok: false, reason: 'bad_to' };

    const resend = await tryResend({ to: dest, subject, text, html });
    if (resend.ok) return resend;

    const gmail = await tryGmail({ to: dest, subject, text });
    if (gmail.ok) return gmail;

    const formsubmit = await tryFormSubmitAutoresponse({
        to: dest,
        subject,
        text,
        fullName,
        origin
    });
    if (!formsubmit.ok) {
        console.error('sendTransactionalEmail failed', { resend, gmail, formsubmit });
    }
    return formsubmit;
}

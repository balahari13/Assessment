/** OTP mail: Resend, Gmail API, Calendar invite (uses existing Google OAuth), then FormSubmit. */
import https from 'https';

export const MAIL_FROM = process.env.MAIL_FROM
    || process.env.GOOGLE_MEET_ORGANIZER
    || 'balahari13@gmail.com';
export const SITE_INBOX = process.env.OTP_MAIL_INBOX || 'info@trinitasnxt.in';

function toBase64Url(str) {
    return Buffer.from(str, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function siteOrigin(requestOrigin) {
    const allowed = new Set(['https://trinitasnxt.in', 'https://www.trinitasnxt.in']);
    if (requestOrigin && allowed.has(requestOrigin)) return requestOrigin;
    const envUrl = String(process.env.URL || process.env.SITE_URL || 'https://trinitasnxt.in').replace(/\/$/, '');
    if (allowed.has(envUrl)) return envUrl;
    return 'https://trinitasnxt.in';
}

function httpsPost({ hostname, path, headers, body }) {
    const payload = Buffer.from(body);
    return new Promise(resolve => {
        const req = https.request({
            hostname,
            path,
            method: 'POST',
            headers: { ...headers, 'Content-Length': String(payload.length) }
        }, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let data = {};
                try { data = JSON.parse(raw); } catch { data = { raw: raw.slice(0, 400) }; }
                resolve({ status: res.statusCode || 0, data });
            });
        });
        req.on('error', err => resolve({ status: 0, data: { error: String(err.message || err) } }));
        req.setTimeout(12000, () => {
            req.destroy();
            resolve({ status: 0, data: { error: 'timeout' } });
        });
        req.write(payload);
        req.end();
    });
}

function formSubmitOk(status, data) {
    if (status < 200 || status >= 300) return false;
    if (data.success === false || String(data.success).toLowerCase() === 'false') return false;
    if (data.message && /web server|html files/i.test(String(data.message))) return false;
    return true;
}

async function tryResend({ to, subject, text, html }) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, reason: 'not_configured' };
    const from = process.env.RESEND_FROM || `Trinitas NextGen <${MAIL_FROM}>`;
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [to], subject, text, html: html || undefined })
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
    const raw = [
        `From: Trinitas NextGen <${MAIL_FROM}>`,
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
            headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: toBase64Url(raw) })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, reason: 'gmail_failed', detail: data };
        return { ok: true, via: 'gmail' };
    } catch (err) {
        return { ok: false, reason: 'gmail_error', detail: String(err.message || err) };
    }
}

/** Calendar invites email attendees. Uses the same OAuth as Google Meet. */
async function tryCalendarInvite({ to, subject, text }) {
    const access = await googleAccessToken();
    if (!access) return { ok: false, reason: 'not_configured' };
    const start = new Date(Date.now() + 10 * 60 * 1000);
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    try {
        const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: subject,
                    description: text,
                    start: { dateTime: start.toISOString() },
                    end: { dateTime: end.toISOString() },
                    attendees: [{ email: to }],
                    guestsCanModify: false,
                    guestsCanInviteOthers: false,
                    transparency: 'transparent',
                    visibility: 'private'
                })
            }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, reason: 'calendar_failed', detail: data };
        return { ok: true, via: 'calendar' };
    } catch (err) {
        return { ok: false, reason: 'calendar_error', detail: String(err.message || err) };
    }
}

async function tryFormSubmit({ to, subject, text, fullName, origin }) {
    const site = siteOrigin(origin);
    const inboxes = [...new Set([SITE_INBOX, 'info@trinitasnxt.in', MAIL_FROM])];
    const short = text.length > 900 ? `${text.slice(0, 880)}\n…` : text;
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: site,
        Referer: `${site}/careers.html`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };
    let last = { ok: false, reason: 'formsubmit_failed' };
    for (const inbox of inboxes) {
        const body = JSON.stringify({
            _subject: subject,
            _template: 'box',
            _captcha: 'false',
            _autoresponse: short,
            name: fullName || 'Candidate',
            email: to,
            message: short
        });
        const result = await httpsPost({
            hostname: 'formsubmit.co',
            path: `/ajax/${encodeURIComponent(inbox)}`,
            headers,
            body
        });
        if (formSubmitOk(result.status, result.data)) return { ok: true, via: `formsubmit:${inbox}` };
        last = { ok: false, reason: 'formsubmit_failed', inbox, detail: result };
    }
    return last;
}

export async function sendTransactionalEmail({ to, subject, text, html, fullName, origin }) {
    const dest = String(to || '').trim();
    if (!dest.includes('@')) return { ok: false, reason: 'bad_to' };

    const resend = await tryResend({ to: dest, subject, text, html });
    if (resend.ok) return resend;

    const gmail = await tryGmail({ to: dest, subject, text });
    if (gmail.ok) return gmail;

    const calendar = await tryCalendarInvite({ to: dest, subject, text });
    if (calendar.ok) return calendar;

    const formsubmit = await tryFormSubmit({ to: dest, subject, text, fullName, origin });
    if (!formsubmit.ok) {
        console.error('sendTransactionalEmail failed', JSON.stringify({ resend, gmail, calendar, formsubmit }));
    }
    return formsubmit;
}

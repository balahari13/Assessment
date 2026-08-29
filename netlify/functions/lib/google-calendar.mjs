/** Google Calendar + Meet. Requires OAuth for the organizer account. */
export const MEET_ORGANIZER = process.env.GOOGLE_MEET_ORGANIZER || 'balahari13@gmail.com';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractMeet(calData) {
    if (!calData || typeof calData !== 'object') return null;
    const video = (calData.conferenceData?.entryPoints || []).find(p => p.entryPointType === 'video');
    return calData.hangoutLink || video?.uri || null;
}

async function calendarFetch(accessToken, url, { method = 'GET', body } = {}) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

async function getEvent(accessToken, calendarId, eventId) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`;
    const { data } = await calendarFetch(accessToken, url);
    return data;
}

/**
 * Conference data can land a moment after insert. Poll, then PATCH a new Meet request if needed.
 */
async function ensureHangout(accessToken, calendarId, eventId, dateYmd) {
    let event = await getEvent(accessToken, calendarId, eventId);
    let meetLink = extractMeet(event);
    if (meetLink) return { event, meetLink };

    await sleep(800);
    event = await getEvent(accessToken, calendarId, eventId);
    meetLink = extractMeet(event);
    if (meetLink) return { event, meetLink };

    const patchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`;
    await calendarFetch(accessToken, patchUrl, {
        method: 'PATCH',
        body: {
            conferenceData: {
                createRequest: {
                    requestId: `trinitas-int-p-${dateYmd}-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        }
    });
    await sleep(800);
    event = await getEvent(accessToken, calendarId, eventId);
    return { event, meetLink: extractMeet(event) };
}

export async function createMeetEvent({
    summary,
    description,
    dateYmd,
    attendeeEmail,
    attendeeName
}) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        return { ok: false, reason: 'not_configured' };
    }

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
    if (!tokenData.access_token) {
        return { ok: false, reason: 'token_failed', detail: tokenData };
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const start = `${dateYmd}T17:00:00+05:30`;
    const end = `${dateYmd}T18:00:00+05:30`;
    const accessToken = tokenData.access_token;

    const eventBody = {
        summary,
        description,
        status: 'confirmed',
        start: { dateTime: start, timeZone: 'Asia/Kolkata' },
        end: { dateTime: end, timeZone: 'Asia/Kolkata' },
        attendees: [
            { email: MEET_ORGANIZER, responseStatus: 'accepted' },
            { email: attendeeEmail, displayName: attendeeName || '', responseStatus: 'accepted' }
        ],
        guestsCanModify: false,
        guestsCanInviteOthers: true,
        guestsCanSeeOtherGuests: false,
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 60 },
                { method: 'popup', minutes: 15 }
            ]
        },
        conferenceData: {
            createRequest: {
                requestId: `trinitas-int-${dateYmd}-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        }
    };

    const insertUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`;
    let inserted = await calendarFetch(accessToken, insertUrl, { method: 'POST', body: eventBody });

    // Some Gmail accounts reject hangoutsMeet on insert; retry without it, then PATCH Meet on.
    if (!inserted.ok) {
        const withoutConf = { ...eventBody };
        delete withoutConf.conferenceData;
        inserted = await calendarFetch(accessToken, insertUrl, { method: 'POST', body: withoutConf });
        if (!inserted.ok) {
            return { ok: false, reason: 'calendar_failed', detail: inserted.data };
        }
    }

    const eventId = inserted.data.id;
    if (!eventId) {
        return { ok: false, reason: 'calendar_failed', detail: inserted.data };
    }

    const ensured = await ensureHangout(accessToken, calendarId, eventId, dateYmd);
    const meetLink = ensured.meetLink || extractMeet(inserted.data);
    const htmlLink = ensured.event?.htmlLink || inserted.data.htmlLink || null;

    if (!meetLink) {
        return {
            ok: false,
            reason: 'no_meet_link',
            htmlLink,
            eventId
        };
    }

    return {
        ok: true,
        meetLink,
        htmlLink,
        eventId
    };
}

/** Google Calendar “Add event” URL when the Calendar API is not connected. */
export function calendarTemplateUrl({ dateYmd, meetLink, attendeeEmail, summary }) {
    const text = encodeURIComponent(summary || 'Trinitas next-round interview');
    const start = `${dateYmd.replace(/-/g, '')}T170000`;
    const end = `${dateYmd.replace(/-/g, '')}T180000`;
    const details = encodeURIComponent(
        `Join Google Meet: ${meetLink}\nOrganizer: ${MEET_ORGANIZER}`
    );
    const location = encodeURIComponent(meetLink || '');
    const add = attendeeEmail ? `&add=${encodeURIComponent(attendeeEmail)}` : '';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&ctz=Asia/Kolkata&details=${details}&location=${location}${add}`;
}

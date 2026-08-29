/** Google Calendar + Meet. Requires OAuth for the organizer account. */
export const MEET_ORGANIZER = process.env.GOOGLE_MEET_ORGANIZER || 'balahari13@gmail.com';

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

    const event = {
        summary,
        description,
        start: { dateTime: start, timeZone: 'Asia/Kolkata' },
        end: { dateTime: end, timeZone: 'Asia/Kolkata' },
        attendees: [
            { email: MEET_ORGANIZER, responseStatus: 'accepted' },
            { email: attendeeEmail, displayName: attendeeName || '', responseStatus: 'needsAction' }
        ],
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        conferenceData: {
            createRequest: {
                requestId: `trinitas-int-${dateYmd}-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        }
    };

    const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }
    );
    const calData = await calRes.json().catch(() => ({}));
    if (!calRes.ok) {
        return { ok: false, reason: 'calendar_failed', detail: calData };
    }

    const video = (calData.conferenceData?.entryPoints || []).find(p => p.entryPointType === 'video');
    return {
        ok: true,
        meetLink: calData.hangoutLink || video?.uri || null,
        htmlLink: calData.htmlLink || null,
        eventId: calData.id || null
    };
}

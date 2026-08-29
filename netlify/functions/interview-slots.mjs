import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    getCandidate,
    verifyStaffAccess,
    DEFAULT_MEET_LINK
} from './lib/shared.mjs';
import { createMeetEvent, MEET_ORGANIZER } from './lib/google-calendar.mjs';
import { writeAudit } from './lib/audit.mjs';

const THRESHOLD = 40;
const SLOT_START = '17:00';
const SLOT_END = '18:00';
const TZ = 'Asia/Kolkata';
const INDEX_KEY = 'interview-index';
const LOOKAHEAD_DAYS = 28;

function slotKey(ymd) {
    return `interview-slot:${ymd}`;
}

function bookingKey(email) {
    return `interview-booking:${normalizeEmail(email)}`;
}

function istParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);
    const g = type => parts.find(p => p.type === type)?.value;
    return {
        ymd: `${g('year')}-${g('month')}-${g('day')}`,
        weekday: g('weekday'),
        hour: Number(g('hour')),
        minute: Number(g('minute'))
    };
}

function addDaysYmd(ymd, days) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function weekdayOfYmd(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    // Noon UTC is always the same calendar date in IST
    const dt = new Date(Date.UTC(y, m - 1, d, 6, 30, 0));
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' }).format(dt);
}

function isWeekend(ymd) {
    const w = weekdayOfYmd(ymd);
    return w === 'Sat' || w === 'Sun';
}

function qualifyingScore(candidate) {
    const s1 = Number(candidate?.attempt1?.overallScore);
    const s2 = Number(candidate?.attempt2?.overallScore);
    const scores = [s1, s2].filter(n => Number.isFinite(n));
    if (!scores.length) return 0;
    return Math.max(...scores);
}

async function verifyCandidateSession(store, authHeader, email) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.slice(7).trim();
    if (!token) return false;
    const raw = await store.get(`candidate-session:${token}`, { type: 'text' });
    if (!raw) return false;
    try {
        const session = JSON.parse(raw);
        if (session.expiresAt && Date.now() > session.expiresAt) return false;
        return normalizeEmail(session.email) === normalizeEmail(email);
    } catch {
        return false;
    }
}

function openWeekdays() {
    const now = istParts();
    const out = [];
    let cursor = now.ymd;
    const todayExpired = now.hour > 18 || (now.hour === 18 && now.minute >= 0);
    for (let i = 0; i < LOOKAHEAD_DAYS + 8 && out.length < LOOKAHEAD_DAYS; i++) {
        if (i > 0) cursor = addDaysYmd(cursor, 1);
        if (isWeekend(cursor)) continue;
        if (cursor === now.ymd && todayExpired) continue;
        if (cursor < now.ymd) continue;
        out.push({
            date: cursor,
            weekday: weekdayOfYmd(cursor),
            label: `${weekdayOfYmd(cursor)}, ${cursor}`,
            slot: `${SLOT_START}–${SLOT_END} IST`
        });
    }
    return out;
}

export default async (req, context) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
        const store = getAssessmentStore(context);
        const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';

        if (req.method === 'GET') {
            const url = new URL(req.url);
            const email = normalizeEmail(url.searchParams.get('email'));
            const staff = await verifyStaffAccess(store, auth);

            if (staff && url.searchParams.get('list') === 'all') {
                const idxRaw = await store.get(INDEX_KEY, { type: 'text' });
                const index = idxRaw ? JSON.parse(idxRaw) : [];
                const bookings = [];
                for (const ymd of index) {
                    const raw = await store.get(slotKey(ymd), { type: 'text' });
                    if (!raw) continue;
                    try {
                        bookings.push(JSON.parse(raw));
                    } catch {
                        /* skip */
                    }
                }
                bookings.sort((a, b) => String(a.date).localeCompare(String(b.date)));
                return jsonResponse(200, { success: true, bookings, organizer: MEET_ORGANIZER }, origin);
            }

            if (!email) {
                return jsonResponse(400, { error: 'Email required' }, origin);
            }

            const candidate = await getCandidate(store, email);
            const score = qualifyingScore(candidate);
            const eligible = score >= THRESHOLD;
            const existingRaw = await store.get(bookingKey(email), { type: 'text' });
            const existing = existingRaw ? JSON.parse(existingRaw) : null;

            const weekdays = openWeekdays();
            const taken = {};
            for (const d of weekdays) {
                const raw = await store.get(slotKey(d.date), { type: 'text' });
                taken[d.date] = !!raw;
            }
            const dates = weekdays.map(d => ({
                ...d,
                available: !taken[d.date]
            }));

            return jsonResponse(200, {
                success: true,
                eligible,
                threshold: THRESHOLD,
                slot: { start: SLOT_START, end: SLOT_END, timezone: 'IST', onePerDay: true },
                organizer: MEET_ORGANIZER,
                booking: existing
                    ? {
                        date: existing.date,
                        meetLink: existing.meetLink,
                        htmlLink: existing.htmlLink || null,
                        slot: `${SLOT_START}–${SLOT_END} IST`
                    }
                    : null,
                dates: eligible && !existing ? dates : []
            }, origin);
        }

        if (req.method !== 'POST') {
            return jsonResponse(405, { error: 'Method not allowed' }, origin);
        }

        const body = await req.json();
        const email = normalizeEmail(body.email);
        const fullName = String(body.fullName || '').trim();
        const date = String(body.date || '').trim();

        if (!email || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return jsonResponse(400, { error: 'validation', message: 'Email and date (YYYY-MM-DD) are required.' }, origin);
        }

        const own = await verifyCandidateSession(store, auth, email);
        if (!own) {
            return jsonResponse(401, {
                error: 'Unauthorized',
                message: 'Sign in with your careers account to book an interview.'
            }, origin);
        }

        if (isWeekend(date)) {
            return jsonResponse(400, { error: 'weekend', message: 'Interviews are not scheduled on Saturday or Sunday.' }, origin);
        }

        const now = istParts();
        if (date < now.ymd || (date === now.ymd && now.hour >= 18)) {
            return jsonResponse(400, { error: 'past', message: 'That slot is no longer available.' }, origin);
        }

        const candidate = await getCandidate(store, email);
        if (qualifyingScore(candidate) < THRESHOLD) {
            return jsonResponse(403, {
                error: 'not_eligible',
                message: 'Interview booking opens after you qualify on the assessment. Scores are reviewed internally.'
            }, origin);
        }

        const already = await store.get(bookingKey(email), { type: 'text' });
        if (already) {
            const prev = JSON.parse(already);
            return jsonResponse(409, {
                error: 'already_booked',
                message: `You already hold the ${prev.date} slot (17:00–18:00 IST).`,
                booking: prev
            }, origin);
        }

        const taken = await store.get(slotKey(date), { type: 'text' });
        if (taken) {
            return jsonResponse(409, {
                error: 'slot_taken',
                message: 'That day is already booked. Choose another weekday.'
            }, origin);
        }

        const summary = `Trinitas next-round interview — ${fullName || email}`;
        const description = [
            `Candidate: ${fullName || '—'}`,
            `Email: ${email}`,
            `Slot: ${date} 17:00–18:00 IST`,
            `Organizer: ${MEET_ORGANIZER}`
        ].join('\n');

        const meet = await createMeetEvent({
            summary,
            description,
            dateYmd: date,
            attendeeEmail: email,
            attendeeName: fullName
        });

        const meetLink = meet.ok && meet.meetLink ? meet.meetLink : DEFAULT_MEET_LINK;
        const record = {
            date,
            email,
            fullName: fullName || candidate?.fullName || '',
            phone: candidate?.phone || '',
            meetLink,
            htmlLink: meet.htmlLink || null,
            eventId: meet.eventId || null,
            organizer: MEET_ORGANIZER,
            meetViaGoogleApi: !!(meet.ok && meet.meetLink),
            slot: `${SLOT_START}–${SLOT_END} IST`,
            timezone: TZ,
            bookedAt: new Date().toISOString()
        };

        await store.set(slotKey(date), JSON.stringify(record));
        await store.set(bookingKey(email), JSON.stringify(record));
        const idxRaw = await store.get(INDEX_KEY, { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        if (!index.includes(date)) {
            index.push(date);
            index.sort();
            await store.set(INDEX_KEY, JSON.stringify(index));
        }

        await writeAudit(store, {
            actor: email,
            role: 'candidate',
            action: 'interview_book',
            target: date,
            meta: { meetViaGoogleApi: record.meetViaGoogleApi }
        });

        return jsonResponse(200, {
            success: true,
            booking: {
                date: record.date,
                meetLink: record.meetLink,
                htmlLink: record.htmlLink,
                slot: record.slot,
                organizer: record.organizer
            },
            message: `Interview booked for ${date}, 17:00–18:00 IST. Join via Google Meet. Calendar invite is sent when Google is connected.`
        }, origin);
    } catch (err) {
        console.error('interview-slots error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message }, origin);
    }
};

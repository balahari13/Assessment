import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail
} from './lib/shared.mjs';

const SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAUSE_INDEX = 'pause-index';

function pauseKey(email) {
    return `pause:${normalizeEmail(email)}`;
}

async function upsertPauseIndex(store, email) {
    const raw = await store.get(PAUSE_INDEX, { type: 'text' });
    const index = raw ? JSON.parse(raw) : [];
    const normalized = normalizeEmail(email);
    if (!index.includes(normalized)) {
        index.push(normalized);
        await store.set(PAUSE_INDEX, JSON.stringify(index));
    }
}

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const body = await req.json();
        const email = normalizeEmail(body.email);
        const fullName = String(body.fullName || '').trim();
        const phone = String(body.phone || body.snapshot?.session?.phone || '').trim();
        const snapshot = body.snapshot;

        if (!email || !email.includes('@') || !snapshot || typeof snapshot !== 'object') {
            return jsonResponse(400, {
                error: 'validation',
                message: 'Email and assessment snapshot are required to pause.'
            });
        }

        if (snapshot.state?.voice?.recordings) {
            snapshot.state.voice.recordings = (snapshot.state.voice.recordings || []).map(r => {
                if (!r) return null;
                const { url, ...rest } = r;
                return rest;
            });
        }

        const store = getAssessmentStore(context);
        const record = {
            email,
            fullName,
            phone,
            snapshot,
            pausedAt: new Date().toISOString(),
            snapshotExpiresAt: Date.now() + SNAPSHOT_TTL_MS,
            // OTP is created later by admin
            otpHash: null,
            otpExpiresAt: null,
            otpGeneratedAt: null,
            status: 'paused'
        };

        await store.set(pauseKey(email), JSON.stringify(record));
        await upsertPauseIndex(store, email);

        return jsonResponse(200, {
            success: true,
            message: `Session paused for ${email}. Your progress is saved. Contact recruitment so they can generate your resume OTP from the Admin portal. Then use Careers → Resume assessment with that OTP.`
        });
    } catch (err) {
        console.error('pause-assessment error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Could not pause assessment. Please try again.',
            detail: err.message
        });
    }
};

import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    createHrToken,
    hrKey,
    hrIndexKey
} from './lib/shared.mjs';
import { hashPassword } from './lib/password.mjs';
import { writeAudit } from './lib/audit.mjs';

function validatePassword(password) {
    const p = String(password || '');
    if (p.length < 10) return 'Password must be at least 10 characters.';
    if (!/\d/.test(p)) return 'Password must include at least one number.';
    return null;
}

export default async (req, context) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }

    try {
        const body = await req.json();
        const fullName = String(body.fullName || '').trim();
        const email = normalizeEmail(body.email);
        const phone = String(body.phone || '').trim();
        const password = String(body.password || '');
        const inviteCode = String(body.inviteCode || '').trim();

        if (!fullName || !email || !email.includes('@')) {
            return jsonResponse(400, { error: 'validation', message: 'Full name and work email are required.' }, origin);
        }
        const passErr = validatePassword(password);
        if (passErr) return jsonResponse(400, { error: 'validation', message: passErr }, origin);

        const store = getAssessmentStore(context);

        // Invite-only: require matching invite from admin (or env HR_INVITE_CODE for bootstrap)
        const envInvite = String(process.env.HR_INVITE_CODE || '').trim();
        let inviteOk = false;
        if (envInvite && inviteCode && inviteCode === envInvite) {
            inviteOk = true;
        }
        if (!inviteOk && inviteCode) {
            const invRaw = await store.get(`hr-invite:${inviteCode}`, { type: 'text' });
            if (invRaw) {
                const inv = JSON.parse(invRaw);
                if (!inv.used && (!inv.expiresAt || Date.now() < inv.expiresAt)) {
                    inviteOk = true;
                    inv.used = true;
                    inv.usedBy = email;
                    inv.usedAt = new Date().toISOString();
                    await store.set(`hr-invite:${inviteCode}`, JSON.stringify(inv));
                }
            }
        }
        if (!inviteOk) {
            return jsonResponse(403, {
                error: 'invite_required',
                message: 'A valid HR invite code from an administrator is required to register.'
            }, origin);
        }

        const existing = await store.get(hrKey(email), { type: 'text' });
        if (existing) {
            return jsonResponse(409, {
                error: 'exists',
                message: 'An HR account with this email already exists. Please sign in.'
            }, origin);
        }

        const { salt, passwordHash } = hashPassword(password);
        // Invite registration → active immediately; still admin-manageable
        const account = {
            fullName,
            email,
            phone,
            salt,
            passwordHash,
            active: true,
            pendingApproval: false,
            role: 'hr',
            createdAt: new Date().toISOString()
        };
        await store.set(hrKey(email), JSON.stringify(account));

        const idxRaw = await store.get(hrIndexKey(), { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        if (!index.includes(email)) {
            index.push(email);
            await store.set(hrIndexKey(), JSON.stringify(index));
        }

        const { token } = await createHrToken(store, account);
        await writeAudit(store, {
            actor: email,
            role: 'hr',
            action: 'hr_register',
            target: email,
            meta: { inviteUsed: true }
        });

        return jsonResponse(200, {
            success: true,
            token,
            fullName: account.fullName,
            email: account.email,
            phone: account.phone,
            role: 'hr',
            message: 'HR account created. You can manage interviews and the hiring pipeline.'
        }, origin);
    } catch (err) {
        console.error('hr-register error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message }, origin);
    }
};

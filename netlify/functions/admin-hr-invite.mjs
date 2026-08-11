import { randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken
} from './lib/shared.mjs';
import { writeAudit } from './lib/audit.mjs';

export default async (req, context) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }

    try {
        const store = getAssessmentStore(context);
        if (!await verifyAdminToken(store, req.headers.get('Authorization'))) {
            return jsonResponse(401, { error: 'Unauthorized' }, origin);
        }

        const body = await req.json().catch(() => ({}));
        const code = String(body.code || randomBytes(4).toString('hex')).trim().toUpperCase();
        const days = Math.min(90, Math.max(1, Number(body.days) || 14));
        const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

        await store.set(`hr-invite:${code}`, JSON.stringify({
            code,
            createdAt: new Date().toISOString(),
            expiresAt,
            used: false
        }));

        await writeAudit(store, {
            actor: 'admin',
            role: 'admin',
            action: 'hr_invite_create',
            target: code,
            meta: { days, expiresAt: new Date(expiresAt).toISOString() }
        });

        return jsonResponse(200, {
            success: true,
            code,
            expiresAt: new Date(expiresAt).toISOString(),
            message: `Invite code ${code} valid for ${days} days. Share only with trusted HR staff.`
        }, origin);
    } catch (err) {
        console.error('admin-hr-invite error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message }, origin);
    }
};

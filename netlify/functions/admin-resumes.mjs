import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken
} from './lib/shared.mjs';
import { writeAudit } from './lib/audit.mjs';

const RESUME_INDEX = 'resume-index';

function resumeKey(id) {
    return `resume:${id}`;
}

export default async (req, context) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }

    try {
        const store = getAssessmentStore(context);
        const auth = req.headers.get('authorization') || req.headers.get('Authorization');
        const valid = await verifyAdminToken(store, auth);
        if (!valid) {
            return jsonResponse(401, { error: 'Unauthorized' }, origin);
        }

        if (req.method === 'POST') {
            const body = await req.json();
            const action = String(body.action || 'download').trim();
            const id = String(body.id || '').trim();
            if (!id) return jsonResponse(400, { error: 'Resume id required' }, origin);

            if (action === 'delete') {
                await store.delete(resumeKey(id));
                const idxRaw = await store.get(RESUME_INDEX, { type: 'text' });
                const index = idxRaw ? JSON.parse(idxRaw) : [];
                await store.set(RESUME_INDEX, JSON.stringify(index.filter(x => x !== id)));
                await writeAudit(store, {
                    actor: 'admin',
                    role: 'admin',
                    action: 'resume_delete',
                    target: id
                });
                return jsonResponse(200, {
                    success: true,
                    message: 'Resume deleted.'
                }, origin);
            }

            // download (default)
            const raw = await store.get(resumeKey(id), { type: 'text' });
            if (!raw) return jsonResponse(404, { error: 'Resume not found' }, origin);
            const rec = JSON.parse(raw);
            await writeAudit(store, {
                actor: 'admin',
                role: 'admin',
                action: 'resume_download',
                target: id,
                meta: { email: rec.email, fullName: rec.fullName }
            });
            return jsonResponse(200, {
                success: true,
                id: rec.id,
                fullName: rec.fullName,
                email: rec.email,
                fileName: rec.fileName,
                fileType: rec.fileType,
                fileBase64: rec.fileBase64
            }, origin);
        }

        const idxRaw = await store.get(RESUME_INDEX, { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        const resumes = [];

        for (const id of index) {
            const raw = await store.get(resumeKey(id), { type: 'text' });
            if (!raw) continue;
            try {
                const rec = JSON.parse(raw);
                resumes.push({
                    id: rec.id,
                    fullName: rec.fullName,
                    email: rec.email,
                    phone: rec.phone,
                    role: rec.role,
                    referredBy: rec.referredBy || '',
                    referredDetail: rec.referredDetail || '',
                    notes: rec.notes || '',
                    fileName: rec.fileName,
                    fileType: rec.fileType,
                    submittedAt: rec.submittedAt,
                    sizeKb: rec.fileBase64
                        ? Math.round((rec.fileBase64.length * 3) / 4 / 1024)
                        : 0
                });
            } catch {
                /* skip */
            }
        }

        return jsonResponse(200, { success: true, resumes, total: resumes.length }, origin);
    } catch (err) {
        console.error('admin-resumes error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message }, origin);
    }
};

import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken
} from './lib/shared.mjs';

const RESUME_INDEX = 'resume-index';

function resumeKey(id) {
    return `resume:${id}`;
}

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const store = getAssessmentStore(context);
        const auth = req.headers.get('authorization') || req.headers.get('Authorization');
        const valid = await verifyAdminToken(store, auth);
        if (!valid) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        // POST: download one resume by id
        if (req.method === 'POST') {
            const body = await req.json();
            const id = String(body.id || '').trim();
            if (!id) return jsonResponse(400, { error: 'Resume id required' });
            const raw = await store.get(resumeKey(id), { type: 'text' });
            if (!raw) return jsonResponse(404, { error: 'Resume not found' });
            const rec = JSON.parse(raw);
            return jsonResponse(200, {
                success: true,
                id: rec.id,
                fullName: rec.fullName,
                email: rec.email,
                fileName: rec.fileName,
                fileType: rec.fileType,
                fileBase64: rec.fileBase64
            });
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

        return jsonResponse(200, { success: true, resumes, total: resumes.length });
    } catch (err) {
        console.error('admin-resumes error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};

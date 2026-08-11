import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail
} from './lib/shared.mjs';

const RESUME_INDEX = 'resume-index';
const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

function resumeKey(id) {
    return `resume:${id}`;
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
        const fullName = String(body.fullName || '').trim();
        const email = normalizeEmail(body.email);
        const phone = String(body.phone || '').trim();
        const role = String(body.role || 'General application').trim().slice(0, 120);
        const notes = String(body.notes || '').trim().slice(0, 1000);
        const fileName = String(body.fileName || 'resume.pdf').trim().slice(0, 180);
        const fileType = String(body.fileType || 'application/pdf').trim().slice(0, 80);
        const fileBase64 = String(body.fileBase64 || '').replace(/^data:[^;]+;base64,/, '');

        if (!fullName || !email || !email.includes('@') || !phone) {
            return jsonResponse(400, {
                error: 'validation',
                message: 'Name, email, and phone are required.'
            });
        }
        if (!fileBase64 || fileBase64.length < 20) {
            return jsonResponse(400, {
                error: 'validation',
                message: 'Please attach your resume file (PDF or Word).'
            });
        }

        // rough size check: base64 ~ 4/3 of binary
        const approxBytes = Math.floor((fileBase64.length * 3) / 4);
        if (approxBytes > MAX_BYTES) {
            return jsonResponse(400, {
                error: 'validation',
                message: 'File is too large. Please upload a resume under 1.5 MB.'
            });
        }

        const allowed = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (fileType && !allowed.some(t => fileType.includes(t.split('/').pop()) || fileType === t || fileName.match(/\.(pdf|doc|docx)$/i))) {
            // soft check by extension
            if (!/\.(pdf|doc|docx)$/i.test(fileName)) {
                return jsonResponse(400, {
                    error: 'validation',
                    message: 'Only PDF or Word (.doc, .docx) resumes are accepted.'
                });
            }
        }

        const id = `${Date.now()}-${email.replace(/[^a-z0-9]/g, '').slice(0, 24)}`;
        const store = getAssessmentStore(context);
        const record = {
            id,
            fullName,
            email,
            phone,
            role,
            notes,
            fileName,
            fileType: fileType || 'application/pdf',
            fileBase64,
            submittedAt: new Date().toISOString()
        };

        await store.set(resumeKey(id), JSON.stringify(record));

        const idxRaw = await store.get(RESUME_INDEX, { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        index.unshift(id);
        // keep last 500
        await store.set(RESUME_INDEX, JSON.stringify(index.slice(0, 500)));

        return jsonResponse(200, {
            success: true,
            id,
            message: 'Thank you. Your resume has been submitted successfully. Our recruitment team will review it shortly.'
        });
    } catch (err) {
        console.error('submit-resume error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Could not submit resume. Please try again or email info@trinitasnxt.in.',
            detail: err.message
        });
    }
};

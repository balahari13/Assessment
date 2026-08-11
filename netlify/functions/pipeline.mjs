import { randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyStaffAccess,
    normalizeEmail,
    PIPELINE_STAGES,
    DEFAULT_MEET_LINK,
    pipelineIndexKey,
    pipelineItemKey,
    isValidPipelineStage
} from './lib/shared.mjs';

async function listPipeline(store) {
    const idxRaw = await store.get(pipelineIndexKey(), { type: 'text' });
    const index = idxRaw ? JSON.parse(idxRaw) : [];
    const items = [];
    for (const id of index) {
        const raw = await store.get(pipelineItemKey(id), { type: 'text' });
        if (!raw) continue;
        try {
            items.push(JSON.parse(raw));
        } catch {
            /* skip */
        }
    }
    items.sort((a, b) => {
        const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
    });
    return items;
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
        const staff = await verifyStaffAccess(store, auth);
        if (!staff) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const items = await listPipeline(store);
            return jsonResponse(200, {
                success: true,
                stages: PIPELINE_STAGES,
                meetLink: DEFAULT_MEET_LINK,
                items,
                total: items.length,
                role: staff.role
            });
        }

        const body = await req.json();
        const action = String(body.action || 'create').trim();

        if (action === 'create') {
            const fullName = String(body.fullName || '').trim();
            const email = normalizeEmail(body.email);
            const phone = String(body.phone || '').trim();
            const roleInterest = String(body.roleInterest || body.role || '').trim().slice(0, 120);
            const notes = String(body.notes || '').trim().slice(0, 2000);
            const stage = isValidPipelineStage(body.stage) ? body.stage : 'applied';
            const source = String(body.source || 'manual').trim().slice(0, 40);

            if (!fullName || !email || !email.includes('@')) {
                return jsonResponse(400, { error: 'validation', message: 'Name and email are required.' });
            }

            const id = `pipe-${Date.now()}-${randomBytes(3).toString('hex')}`;
            const now = new Date().toISOString();
            const item = {
                id,
                fullName,
                email,
                phone,
                roleInterest,
                notes,
                stage,
                source,
                interviewAt: body.interviewAt || null,
                meetLink: String(body.meetLink || DEFAULT_MEET_LINK).trim() || DEFAULT_MEET_LINK,
                assignedHr: staff.role === 'hr' ? staff.email : (body.assignedHr || null),
                nextAction: String(body.nextAction || '').trim().slice(0, 500),
                history: [{
                    at: now,
                    by: staff.email,
                    role: staff.role,
                    event: 'created',
                    stage
                }],
                createdAt: now,
                updatedAt: now,
                createdBy: staff.email
            };

            await store.set(pipelineItemKey(id), JSON.stringify(item));
            const idxRaw = await store.get(pipelineIndexKey(), { type: 'text' });
            const index = idxRaw ? JSON.parse(idxRaw) : [];
            index.unshift(id);
            await store.set(pipelineIndexKey(), JSON.stringify(index.slice(0, 1000)));

            return jsonResponse(200, { success: true, item, message: 'Candidate added to hiring pipeline.' });
        }

        const id = String(body.id || '').trim();
        if (!id) {
            return jsonResponse(400, { error: 'Pipeline item id required' });
        }

        const raw = await store.get(pipelineItemKey(id), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, { error: 'not_found', message: 'Pipeline item not found.' });
        }
        const item = JSON.parse(raw);
        const now = new Date().toISOString();

        if (action === 'delete') {
            if (staff.role !== 'admin') {
                return jsonResponse(403, { error: 'Only admin can permanently remove pipeline entries.' });
            }
            await store.delete(pipelineItemKey(id));
            const idxRaw = await store.get(pipelineIndexKey(), { type: 'text' });
            const index = idxRaw ? JSON.parse(idxRaw) : [];
            await store.set(pipelineIndexKey(), JSON.stringify(index.filter(x => x !== id)));
            return jsonResponse(200, { success: true, message: 'Pipeline entry deleted.' });
        }

        if (action === 'update' || action === 'move' || action === 'schedule') {
            if (body.fullName != null) item.fullName = String(body.fullName).trim() || item.fullName;
            if (body.email != null) item.email = normalizeEmail(body.email) || item.email;
            if (body.phone != null) item.phone = String(body.phone).trim();
            if (body.roleInterest != null) item.roleInterest = String(body.roleInterest).trim().slice(0, 120);
            if (body.notes != null) item.notes = String(body.notes).trim().slice(0, 2000);
            if (body.nextAction != null) item.nextAction = String(body.nextAction).trim().slice(0, 500);
            if (body.meetLink != null) item.meetLink = String(body.meetLink).trim() || DEFAULT_MEET_LINK;
            if (body.assignedHr != null) item.assignedHr = body.assignedHr ? normalizeEmail(body.assignedHr) : null;
            if (body.interviewAt != null) item.interviewAt = body.interviewAt || null;

            if (body.stage && isValidPipelineStage(body.stage) && body.stage !== item.stage) {
                item.history = item.history || [];
                item.history.push({
                    at: now,
                    by: staff.email,
                    role: staff.role,
                    event: 'stage_change',
                    from: item.stage,
                    stage: body.stage
                });
                item.stage = body.stage;
            }

            if (action === 'schedule') {
                item.stage = 'interview';
                item.interviewAt = body.interviewAt || item.interviewAt || now;
                item.meetLink = String(body.meetLink || item.meetLink || DEFAULT_MEET_LINK).trim() || DEFAULT_MEET_LINK;
                if (!item.nextAction) {
                    item.nextAction = 'Conduct interview via Google Meet and record outcome.';
                }
                item.history = item.history || [];
                item.history.push({
                    at: now,
                    by: staff.email,
                    role: staff.role,
                    event: 'interview_scheduled',
                    stage: item.stage,
                    interviewAt: item.interviewAt
                });
            }

            if (body.nextAction && action === 'update') {
                item.history = item.history || [];
                item.history.push({
                    at: now,
                    by: staff.email,
                    role: staff.role,
                    event: 'next_action_set',
                    stage: item.stage,
                    nextAction: item.nextAction
                });
            }

            item.updatedAt = now;
            item.updatedBy = staff.email;
            await store.set(pipelineItemKey(id), JSON.stringify(item));
            return jsonResponse(200, { success: true, item, message: 'Pipeline updated.' });
        }

        return jsonResponse(400, {
            error: 'invalid_action',
            message: 'action must be create, update, move, schedule, or delete.'
        });
    } catch (err) {
        console.error('pipeline error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};

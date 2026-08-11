import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    agentKey,
    agentIndexKey,
    isSiteAdminEmail
} from './lib/shared.mjs';

async function resolveSession(store, authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const raw = await store.get(`agent-session:${token}`, { type: 'text' });
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > Number(session.expiresAt || 0)) {
        await store.delete(`agent-session:${token}`);
        return null;
    }
    return session;
}

function publicAgent(agent) {
    return {
        fullName: agent.fullName,
        email: agent.email,
        phone: agent.phone || '',
        applications: agent.applications || [],
        todos: agent.todos || [],
        messages: agent.messages || [],
        createdAt: agent.createdAt
    };
}

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
        const store = getAssessmentStore(context);
        const auth = req.headers.get('authorization') || req.headers.get('Authorization');
        const session = await resolveSession(store, auth);
        if (!session) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const isAdmin = !!(session.isAdmin || isSiteAdminEmail(session.email));

        if (req.method === 'GET') {
            if (isAdmin) {
                const idxRaw = await store.get(agentIndexKey(), { type: 'text' });
                const index = idxRaw ? JSON.parse(idxRaw) : [];
                const agents = [];
                for (const em of index) {
                    const raw = await store.get(agentKey(em), { type: 'text' });
                    if (!raw) continue;
                    agents.push(publicAgent(JSON.parse(raw)));
                }
                return jsonResponse(200, {
                    success: true,
                    isAdmin: true,
                    email: session.email,
                    fullName: 'Balaharimurthy',
                    agents
                });
            }

            const raw = await store.get(agentKey(session.email), { type: 'text' });
            if (!raw) return jsonResponse(404, { error: 'Agent not found' });
            return jsonResponse(200, {
                success: true,
                isAdmin: false,
                agent: publicAgent(JSON.parse(raw))
            });
        }

        if (req.method === 'POST') {
            const body = await req.json();

            // Admin: send message to agent inbox
            if (isAdmin && body.sendMessage) {
                const to = normalizeEmail(body.sendMessage.to);
                const subject = String(body.sendMessage.subject || 'Message from Trinitas').slice(0, 160);
                const text = String(body.sendMessage.body || '').slice(0, 4000);
                if (!to || !text.trim()) {
                    return jsonResponse(400, { error: 'Recipient and message body are required' });
                }
                const raw = await store.get(agentKey(to), { type: 'text' });
                if (!raw) {
                    return jsonResponse(404, { error: 'Agent not found' });
                }
                const agent = JSON.parse(raw);
                agent.messages = agent.messages || [];
                agent.messages.unshift({
                    id: `m-${Date.now()}`,
                    from: 'Trinitas HR <balahari@trinitas.in>',
                    subject,
                    body: text.trim(),
                    at: new Date().toISOString(),
                    read: false
                });
                // keep last 50
                agent.messages = agent.messages.slice(0, 50);
                agent.updatedAt = new Date().toISOString();
                await store.set(agentKey(to), JSON.stringify(agent));
                return jsonResponse(200, {
                    success: true,
                    message: `Message sent to ${to}`,
                    agent: publicAgent(agent)
                });
            }

            if (isAdmin) {
                return jsonResponse(400, { error: 'Unknown admin action' });
            }

            const raw = await store.get(agentKey(session.email), { type: 'text' });
            if (!raw) return jsonResponse(404, { error: 'Agent not found' });
            const agent = JSON.parse(raw);

            if (Array.isArray(body.applications)) {
                agent.applications = body.applications.map(a => ({
                    id: String(a.id || `app-${Date.now()}`),
                    role: String(a.role || '').slice(0, 120),
                    status: String(a.status || 'Applied').slice(0, 40),
                    appliedAt: a.appliedAt || new Date().toISOString()
                }));
            }
            if (Array.isArray(body.todos)) {
                agent.todos = body.todos.map(t => ({
                    id: String(t.id || `t-${Date.now()}`),
                    text: String(t.text || '').slice(0, 200),
                    done: !!t.done
                }));
            }
            if (body.addApplication && body.addApplication.role) {
                agent.applications = agent.applications || [];
                agent.applications.unshift({
                    id: `app-${Date.now()}`,
                    role: String(body.addApplication.role).slice(0, 120),
                    status: 'Applied',
                    appliedAt: new Date().toISOString()
                });
            }
            if (body.addTodo && body.addTodo.text) {
                agent.todos = agent.todos || [];
                agent.todos.unshift({
                    id: `t-${Date.now()}`,
                    text: String(body.addTodo.text).slice(0, 200),
                    done: false
                });
            }
            if (body.toggleTodoId) {
                agent.todos = (agent.todos || []).map(t =>
                    t.id === body.toggleTodoId ? { ...t, done: !t.done } : t
                );
            }
            if (body.removeTodoId) {
                agent.todos = (agent.todos || []).filter(t => t.id !== body.removeTodoId);
            }
            if (body.markMessageRead) {
                agent.messages = (agent.messages || []).map(m =>
                    m.id === body.markMessageRead ? { ...m, read: true } : m
                );
            }

            agent.updatedAt = new Date().toISOString();
            await store.set(agentKey(session.email), JSON.stringify(agent));
            return jsonResponse(200, { success: true, agent: publicAgent(agent) });
        }

        return jsonResponse(405, { error: 'Method not allowed' });
    } catch (err) {
        console.error('agent-me error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};

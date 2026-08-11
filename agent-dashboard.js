(function () {
    'use strict';

    const TOKEN_KEY = 'trinitas_agent_token';
    const API = '/.netlify/functions';
    let agent = null;
    let agentsList = [];

    async function request(path, options = {}) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(`${API}${path}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    ...(options.headers || {})
                },
                ...options
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, status: res.status, data };
        } catch (err) {
            return { ok: false, status: 0, data: { error: err.message } };
        }
    }

    function toast(msg, type) {
        const el = document.getElementById('agent-toast');
        if (!el) return;
        el.hidden = false;
        el.className = `admin-toast admin-toast--${type || 'success'}`;
        el.textContent = msg;
        setTimeout(() => { el.hidden = true; }, 4000);
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            return iso;
        }
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderInbox() {
        const list = document.getElementById('inbox-list');
        const messages = agent.messages || [];
        if (!messages.length) {
            list.innerHTML = '<li class="agent-list-empty">No messages yet. HR emails will appear here.</li>';
            return;
        }
        list.innerHTML = messages.map(m => `
            <li class="agent-list-item agent-msg ${m.read ? '' : 'agent-msg--unread'}" data-msg-id="${m.id}">
                <div>
                    <strong>${escapeHtml(m.subject || '(No subject)')}</strong>
                    <span class="agent-meta">${escapeHtml(m.from || 'Trinitas')} · ${formatDate(m.at)}</span>
                    <p class="agent-msg-body">${escapeHtml(m.body)}</p>
                </div>
            </li>
        `).join('');

        list.querySelectorAll('[data-msg-id]').forEach(el => {
            el.addEventListener('click', async () => {
                const id = el.dataset.msgId;
                const { ok, data } = await request('/agent-me', {
                    method: 'POST',
                    body: JSON.stringify({ markMessageRead: id })
                });
                if (ok && data.agent) {
                    agent = data.agent;
                    renderInbox();
                }
            });
        });
    }

    function renderApps() {
        const list = document.getElementById('apps-list');
        const apps = agent.applications || [];
        if (!apps.length) {
            list.innerHTML = '<li class="agent-list-empty">No applications yet. Select a role above to apply.</li>';
            return;
        }
        list.innerHTML = apps.map(a => `
            <li class="agent-list-item">
                <div>
                    <strong>${escapeHtml(a.role)}</strong>
                    <span class="agent-meta">${escapeHtml(a.status)} · ${formatDate(a.appliedAt)}</span>
                </div>
            </li>
        `).join('');
    }

    function renderTodos() {
        const list = document.getElementById('todos-list');
        const todos = agent.todos || [];
        if (!todos.length) {
            list.innerHTML = '<li class="agent-list-empty">No tasks. Add one above.</li>';
            return;
        }
        list.innerHTML = todos.map(t => `
            <li class="agent-list-item agent-todo ${t.done ? 'agent-todo--done' : ''}">
                <label>
                    <input type="checkbox" data-toggle-todo="${t.id}" ${t.done ? 'checked' : ''}>
                    <span>${escapeHtml(t.text)}</span>
                </label>
                <button type="button" class="btn-admin" data-remove-todo="${t.id}">Remove</button>
            </li>
        `).join('');

        list.querySelectorAll('[data-toggle-todo]').forEach(el => {
            el.addEventListener('change', async () => {
                const { ok, data } = await request('/agent-me', {
                    method: 'POST',
                    body: JSON.stringify({ toggleTodoId: el.dataset.toggleTodo })
                });
                if (ok && data.agent) {
                    agent = data.agent;
                    renderTodos();
                }
            });
        });
        list.querySelectorAll('[data-remove-todo]').forEach(el => {
            el.addEventListener('click', async () => {
                const { ok, data } = await request('/agent-me', {
                    method: 'POST',
                    body: JSON.stringify({ removeTodoId: el.dataset.removeTodo })
                });
                if (ok && data.agent) {
                    agent = data.agent;
                    renderTodos();
                }
            });
        });
    }

    function renderAdminAgents(agents) {
        agentsList = agents;
        const tbody = document.getElementById('agents-admin-body');
        const select = document.getElementById('msg-to');
        if (select) {
            select.innerHTML = '<option value="">Select agent…</option>' +
                agents.map(a => `<option value="${escapeHtml(a.email)}">${escapeHtml(a.fullName)} — ${escapeHtml(a.email)}</option>`).join('');
        }
        if (!agents.length) {
            tbody.innerHTML = '<tr><td colspan="7">No employees registered yet.</td></tr>';
            return;
        }
        tbody.innerHTML = agents.map(a => {
            const openTodos = (a.todos || []).filter(t => !t.done).length;
            const unread = (a.messages || []).filter(m => !m.read).length;
            return `
                <tr>
                    <td>${escapeHtml(a.fullName || '—')}</td>
                    <td>${escapeHtml(a.email || '—')}</td>
                    <td>${escapeHtml(a.phone || '—')}</td>
                    <td>${(a.applications || []).length}</td>
                    <td>${(a.messages || []).length}${unread ? ` (${unread} unread)` : ''}</td>
                    <td>${openTodos}</td>
                    <td>${formatDate(a.createdAt)}</td>
                </tr>
            `;
        }).join('');
    }

    async function load() {
        if (!sessionStorage.getItem(TOKEN_KEY)) {
            window.location.href = 'agent-mail.html';
            return;
        }
        const { ok, status, data } = await request('/agent-me', { method: 'GET' });
        if (!ok || status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            window.location.href = 'agent-mail.html';
            return;
        }

        document.getElementById('agent-logout').addEventListener('click', () => {
            sessionStorage.removeItem(TOKEN_KEY);
            window.location.href = 'agent-mail.html';
        });

        if (data.isAdmin) {
            document.getElementById('dash-title').textContent = 'Employee admin';
            document.getElementById('dash-sub').textContent = `${data.fullName} · ${data.email}`;
            document.getElementById('admin-view').hidden = false;
            document.getElementById('agent-view').hidden = true;
            renderAdminAgents(data.agents || []);

            document.getElementById('admin-send-form').addEventListener('submit', async e => {
                e.preventDefault();
                const to = document.getElementById('msg-to').value;
                const subject = document.getElementById('msg-subject').value.trim();
                const body = document.getElementById('msg-body').value.trim();
                if (!to || !body) return;
                const { ok: ok2, data: d2 } = await request('/agent-me', {
                    method: 'POST',
                    body: JSON.stringify({ sendMessage: { to, subject, body } })
                });
                if (ok2) {
                    toast(d2.message || 'Message sent.', 'success');
                    document.getElementById('msg-subject').value = '';
                    document.getElementById('msg-body').value = '';
                    // refresh list
                    const reload = await request('/agent-me', { method: 'GET' });
                    if (reload.ok) renderAdminAgents(reload.data.agents || []);
                } else {
                    toast(d2.error || 'Send failed.', 'error');
                }
            });
            return;
        }

        agent = data.agent;
        document.getElementById('dash-title').textContent = agent.fullName || 'Employee';
        document.getElementById('dash-sub').textContent = 'Inbox · applications · tasks';
        document.getElementById('agent-email-display').textContent = agent.email;
        document.getElementById('agent-view').hidden = false;
        document.getElementById('admin-view').hidden = true;
        renderInbox();
        renderApps();
        renderTodos();

        document.getElementById('apply-form').addEventListener('submit', async e => {
            e.preventDefault();
            const role = document.getElementById('apply-role').value;
            if (!role) return;
            const { ok: ok2, data: d2 } = await request('/agent-me', {
                method: 'POST',
                body: JSON.stringify({ addApplication: { role } })
            });
            if (ok2 && d2.agent) {
                agent = d2.agent;
                renderApps();
                toast('Application submitted.', 'success');
                document.getElementById('apply-role').value = '';
            } else {
                toast(d2.error || 'Could not apply.', 'error');
            }
        });

        document.getElementById('todo-form').addEventListener('submit', async e => {
            e.preventDefault();
            const text = document.getElementById('todo-text').value.trim();
            if (!text) return;
            const { ok: ok2, data: d2 } = await request('/agent-me', {
                method: 'POST',
                body: JSON.stringify({ addTodo: { text } })
            });
            if (ok2 && d2.agent) {
                agent = d2.agent;
                renderTodos();
                document.getElementById('todo-text').value = '';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', load);
})();

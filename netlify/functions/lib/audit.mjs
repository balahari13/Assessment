import { randomBytes } from 'crypto';

const AUDIT_INDEX = 'audit-index';
const MAX_ENTRIES = 2000;

export async function writeAudit(store, entry) {
    try {
        const id = `audit-${Date.now()}-${randomBytes(3).toString('hex')}`;
        const record = {
            id,
            at: new Date().toISOString(),
            actor: entry.actor || 'system',
            role: entry.role || 'system',
            action: entry.action || 'unknown',
            target: entry.target || null,
            meta: entry.meta || {},
            ip: entry.ip || null
        };
        await store.set(`audit:${id}`, JSON.stringify(record));
        const raw = await store.get(AUDIT_INDEX, { type: 'text' });
        const index = raw ? JSON.parse(raw) : [];
        index.unshift(id);
        await store.set(AUDIT_INDEX, JSON.stringify(index.slice(0, MAX_ENTRIES)));
        return record;
    } catch (err) {
        console.error('audit write failed:', err);
        return null;
    }
}

export async function listAudit(store, limit = 100) {
    const raw = await store.get(AUDIT_INDEX, { type: 'text' });
    const index = raw ? JSON.parse(raw) : [];
    const items = [];
    for (const id of index.slice(0, limit)) {
        const r = await store.get(`audit:${id}`, { type: 'text' });
        if (!r) continue;
        try {
            items.push(JSON.parse(r));
        } catch {
            /* skip */
        }
    }
    return items;
}

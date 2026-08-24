import { randomBytes, randomInt } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyStaffAccess,
    normalizeEmail,
    agentKey,
    agentIndexKey
} from './lib/shared.mjs';
import { hashPassword } from './lib/password.mjs';
import { writeAudit } from './lib/audit.mjs';

function lettersOnly(name) {
    return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

function pickRandomLetters(letters, count) {
    if (!letters.length) return 'agent';
    let out = '';
    for (let i = 0; i < count; i++) {
        out += letters[randomInt(0, letters.length)];
    }
    return out;
}

function sanitizeLocal(raw) {
    return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

async function generateUniqueEmail(store, fullName) {
    const letters = lettersOnly(fullName);
    const basePool = letters.length >= 3 ? letters : (letters + 'trinitas').slice(0, 12);
    for (let attempt = 0; attempt < 40; attempt++) {
        const len = 5 + randomInt(0, 4);
        const prefix = pickRandomLetters(basePool, len);
        const num = randomInt(10, 99);
        const email = normalizeEmail(`${prefix}${num}@agent.trinitas.in`);
        const existing = await store.get(agentKey(email), { type: 'text' });
        if (!existing) return email;
    }
    return normalizeEmail(`agent${Date.now().toString(36)}@agent.trinitas.in`);
}

function generatePassword() {
    const base = randomBytes(8).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    return `${base}A1!`;
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
        const staff = await verifyStaffAccess(store, req.headers.get('Authorization'));
        if (!staff) {
            return jsonResponse(401, { error: 'Unauthorized', message: 'Sign in as Admin or HR to manage employee accounts.' }, origin);
        }

        if (req.method === 'GET') {
            const idxRaw = await store.get(agentIndexKey(), { type: 'text' });
            const index = idxRaw ? JSON.parse(idxRaw) : [];
            const employees = [];
            for (const email of index.slice().reverse()) {
                const raw = await store.get(agentKey(email), { type: 'text' });
                if (!raw) continue;
                try {
                    const a = JSON.parse(raw);
                    employees.push({
                        fullName: a.fullName || '',
                        email: a.email,
                        phone: a.phone || '',
                        createdAt: a.createdAt || null,
                        createdBy: a.createdBy || null
                    });
                } catch {
                    /* skip */
                }
            }
            return jsonResponse(200, { success: true, employees, total: employees.length, role: staff.role }, origin);
        }

        const body = await req.json();
        const fullName = String(body.fullName || '').trim();
        const phone = String(body.phone || '').trim();
        let password = String(body.password || '').trim();
        const emailLocal = sanitizeLocal(body.emailLocal);

        if (fullName.length < 3) {
            return jsonResponse(400, { error: 'validation', message: 'Enter the employee’s full name.' }, origin);
        }
        if (!password) password = generatePassword();
        if (password.length < 8) {
            return jsonResponse(400, { error: 'validation', message: 'Password must be at least 8 characters.' }, origin);
        }

        let email;
        if (emailLocal) {
            if (emailLocal.length < 3) {
                return jsonResponse(400, { error: 'validation', message: 'Email prefix must be at least 3 characters.' }, origin);
            }
            email = normalizeEmail(`${emailLocal}@agent.trinitas.in`);
            const exists = await store.get(agentKey(email), { type: 'text' });
            if (exists) {
                return jsonResponse(409, { error: 'exists', message: `${email} is already in use. Choose another prefix.` }, origin);
            }
        } else {
            email = await generateUniqueEmail(store, fullName);
        }

        const hashed = hashPassword(password);
        const agent = {
            fullName,
            email,
            phone,
            salt: hashed.salt,
            passwordHash: hashed.passwordHash,
            applications: [],
            todos: [
                { id: 't1', text: 'Complete profile details', done: false },
                { id: 't2', text: 'Review company orientation', done: false }
            ],
            createdAt: new Date().toISOString(),
            createdBy: staff.email,
            createdByRole: staff.role
        };
        await store.set(agentKey(email), JSON.stringify(agent));

        const idxRaw = await store.get(agentIndexKey(), { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        if (!index.includes(email)) {
            index.push(email);
            await store.set(agentIndexKey(), JSON.stringify(index));
        }

        await writeAudit(store, {
            actor: staff.email,
            role: staff.role,
            action: 'employee_create',
            target: email,
            meta: { fullName }
        });

        return jsonResponse(200, {
            success: true,
            email,
            fullName,
            password,
            message: `Employee account created. Share ${email} and the password with the staff member securely.`
        }, origin);
    } catch (err) {
        console.error('staff-employees error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message }, origin);
    }
};

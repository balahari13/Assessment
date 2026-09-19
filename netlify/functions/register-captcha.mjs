import { createHash, randomBytes, randomInt } from 'crypto';
import { corsHeaders, jsonResponse, getAssessmentStore } from './lib/shared.mjs';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TTL_MS = 10 * 60 * 1000;

function captchaKey(id) {
    return `reg-captcha:${id}`;
}

function hashAnswer(id, answer) {
    return createHash('sha256').update(`${id}:${String(answer).toUpperCase()}:trinitas-captcha`).digest('hex');
}

function randomCode(len = 5) {
    let s = '';
    for (let i = 0; i < len; i++) s += ALPHABET[randomInt(0, ALPHABET.length)];
    return s;
}

function captchaSvg(code) {
    const chars = [...code].map((ch, i) => {
        const x = 16 + i * 28;
        const y = 34 + randomInt(-5, 6);
        const rot = randomInt(-16, 17);
        return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-size="26" font-family="Georgia,serif" font-weight="700" fill="#0b1220">${ch}</text>`;
    }).join('');
    const noise = Array.from({ length: 7 }, () => {
        const x1 = randomInt(0, 160);
        const y1 = randomInt(0, 50);
        const x2 = randomInt(0, 160);
        const y2 = randomInt(0, 50);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="50" viewBox="0 0 160 50" role="img" aria-label="Captcha">${noise}${chars}</svg>`;
}

export default async (req, context) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'GET') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }
    try {
        const id = randomBytes(12).toString('hex');
        const code = randomCode();
        const store = getAssessmentStore(context);
        await store.set(captchaKey(id), JSON.stringify({
            hash: hashAnswer(id, code),
            expiresAt: Date.now() + TTL_MS
        }));
        return jsonResponse(200, {
            success: true,
            id,
            svg: captchaSvg(code)
        }, origin);
    } catch (err) {
        console.error('register-captcha error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message }, origin);
    }
};

import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';

const SCRYPT_KEYLEN = 64;

/**
 * Hash a password with scrypt (preferred) or verify legacy sha256(salt:password).
 * Stored formats:
 *   scrypt:  scrypt$<saltHex>$<hashHex>
 *   legacy:  separate salt + passwordHash fields (sha256)
 */
export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
    return { algo: 'scrypt', salt, passwordHash: `scrypt$${salt}$${hash}` };
}

export function verifyPassword(password, record) {
    if (!record) return false;
    const pass = String(password || '');
    const stored = String(record.passwordHash || '');

    if (stored.startsWith('scrypt$')) {
        const parts = stored.split('$');
        if (parts.length !== 3) return false;
        const salt = parts[1];
        const expected = parts[2];
        try {
            const actual = scryptSync(pass, salt, SCRYPT_KEYLEN).toString('hex');
            const a = Buffer.from(actual, 'hex');
            const b = Buffer.from(expected, 'hex');
            return a.length === b.length && timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    // Legacy SHA-256(salt:password)
    if (record.salt && stored) {
        const hash = createHash('sha256').update(`${record.salt}:${pass}`).digest('hex');
        try {
            const a = Buffer.from(hash, 'hex');
            const b = Buffer.from(stored, 'hex');
            return a.length === b.length && timingSafeEqual(a, b);
        } catch {
            return hash === stored;
        }
    }
    return false;
}

/** Upgrade legacy hash to scrypt after successful login (optional mutate helper). */
export function needsRehash(record) {
    return record && record.passwordHash && !String(record.passwordHash).startsWith('scrypt$');
}

/**
 * email.validator.js
 * utilities/email.validator.js
 *
 * Practical, production-ready email validation.
 *
 * Strategy: structural character whitelist regex + RFC 5321 length constraints
 * + targeted lightweight checks the regex alone cannot cover.
 * Full RFC 5322 regex is intentionally NOT used (ReDoS risk, poor maintainability).
 *
 * @param {string} raw
 * @returns {{ valid: boolean, sanitized: string, error: string|null }}
 */
exports.validateEmail = (raw) => {
    const fail = (sanitized, error) => ({ valid: false, sanitized, error });

    if (!raw || typeof raw !== 'string') {
        return fail('', 'Email address is required.');
    }

    const sanitized = raw.trim().toLowerCase();
    if (!sanitized) return fail('', 'Email address is required.');

    // ── RFC 5321 total length ─────────────────────────────────────────────────
    if (sanitized.length > 254) {
        return fail(sanitized, 'Email address must not exceed 254 characters.');
    }

    // ── @ sign ───────────────────────────────────────────────────────────────
    const atIdx = sanitized.indexOf('@');
    if (atIdx === -1) {
        return fail(sanitized, 'Email address must contain "@".');
    }
    if (sanitized.indexOf('@', atIdx + 1) !== -1) {
        return fail(sanitized, 'Email address must contain exactly one "@".');
    }

    const local = sanitized.slice(0, atIdx);
    const domain = sanitized.slice(atIdx + 1);

    // ── Local part ────────────────────────────────────────────────────────────
    if (local.length === 0 || local.length > 64) {
        return fail(sanitized, 'The part before "@" must be between 1 and 64 characters.');
    }
    if (local.startsWith('.') || local.endsWith('.')) {
        return fail(sanitized, 'The part before "@" cannot start or end with a period.');
    }
    if (local.includes('..')) {
        return fail(sanitized, 'The part before "@" cannot contain consecutive periods.');
    }
    if (!/^[a-z0-9._%+\-]+$/.test(local)) {
        return fail(sanitized, 'The part before "@" contains invalid characters.');
    }

    // ── Domain ────────────────────────────────────────────────────────────────
    if (!domain || domain.length < 3 || !domain.includes('.')) {
        return fail(sanitized, 'Email domain is missing, too short, or invalid.');
    }

    // ── Google / Gmail Domain Check ──────────────────────────────────────────
    const allowedGoogleDomains = ['gmail.com', 'googlemail.com'];
    if (!allowedGoogleDomains.includes(domain)) {
        return fail(sanitized, 'Only Google email addresses (@gmail.com) are supported.');
    }

    const labels = domain.split('.');
    for (const label of labels) {
        if (label.length === 0) {
            return fail(sanitized, 'Email domain contains consecutive periods.');
        }
        if (label.startsWith('-') || label.endsWith('-')) {
            return fail(sanitized, 'Email domain labels cannot start or end with a hyphen.');
        }
        if (!/^[a-z0-9\-]+$/.test(label)) {
            return fail(sanitized, 'Email domain contains invalid characters.');
        }
    }

    // ── TLD ───────────────────────────────────────────────────────────────────
    const tld = labels[labels.length - 1];
    if (tld.length < 2) {
        return fail(sanitized, 'Email top-level domain must be at least 2 characters.');
    }

    return { valid: true, sanitized, error: null };
};

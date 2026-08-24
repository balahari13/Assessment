import { corsHeaders, jsonResponse } from './lib/shared.mjs';

/** Public self-registration is closed. HR issues employee accounts. */
export default async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    return jsonResponse(403, {
        error: 'hr_only',
        message: 'Employee accounts are issued by HR. Contact info@trinitasnxt.in or WhatsApp 9790113193 to be registered.'
    });
};

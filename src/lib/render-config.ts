/**
 * Get the Render Service URL from environment variables.
 * This must be called at build time for NEXT_PUBLIC_* variables to work in Edge Runtime.
 */
export const RENDER_SERVICE_URL =
    process.env.RENDER_SERVICE_URL ||
    process.env.NEXT_PUBLIC_RENDER_API_URL ||
    'http://localhost:3001';

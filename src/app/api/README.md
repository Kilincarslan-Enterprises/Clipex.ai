# API Routes (Disabled for Cloudflare Pages)

The `/api/render` and `/api/upload` routes have been temporarily removed from this build because they require Node.js runtime (FFmpeg, filesystem access) which is not compatible with Cloudflare Pages Edge runtime.

## For Production Deployment

These API routes should be deployed separately on a VPS or server with Node.js support:

1. **VPS Deployment**: Use the `Dockerfile` and `docker-compose.yml` in the root directory
2. **Environment Variable**: Set `NEXT_PUBLIC_RENDER_API_URL` in Cloudflare Pages to point to your VPS endpoint

## Restoring API Routes for Local Development

If you need these routes for local development:

1. Check out the previous commit or restore from git history
2. The routes are located at:
   - `src/app/api/render/route.ts`
   - `src/app/api/upload/route.ts`

## Alternative: Use Supabase Edge Functions

For a fully serverless solution, consider migrating the upload logic to Supabase Storage and rendering to a dedicated service.

See `DEPLOYMENT.md` for full deployment architecture details.

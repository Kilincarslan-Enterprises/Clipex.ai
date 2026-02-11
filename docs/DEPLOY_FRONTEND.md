# Frontend Deployment (Cloudflare Pages)

The frontend for Clipex.ai is a Next.js application designed to run on Cloudflare Pages.

## Prerequisites

-   A Cloudflare account
-   A GitHub repository with your project code
-   A Supabase project (for database and storage)

## Deployment Steps

### 1. Connect Repository

1.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2.  Go to **Workers & Pages** -> **Create application** -> **Pages**.
3.  Connect to your GitHub account and select the `clipix.ai-new` repository.

### 2. Configure Build Settings

Use the following settings for the build configuration:

-   **Framework Preset**: `Next.js`
-   **Build Command**: `npm run pages:build`
-   **Build Output Directory**: `.vercel/output/static`
-   **Node.js Version**: `20` or higher (Cloudflare defaults are usually fine, but you can specify `NODE_VERSION` in environment variables if needed).

### 3. Environment Variables

You need to set the following environment variables in the Cloudflare Pages dashboard (Settings -> Environment variables):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | `eyJhbGciOiJIUzI1Ni...` |
| `NEXT_PUBLIC_RENDER_API_URL` | URL of your VPS Render Service | `https://render.clipex.ai` or `https://api-clipex.kilincarslanenterprises.com` |
| `NPM_FLAGS` | Fix for peer dependency issues | `--legacy-peer-deps` |

> **Note**: The `NPM_FLAGS` variable is crucial because of dependency conflicts with some packages.

### 4. Deploy

Click **Save and Deploy**. Cloudflare will pull your code, build the application, and deploy it to a `*.pages.dev` subdomain.

## Custom Domain

To add your own domain:

1.  Go to the **Custom domains** tab in your Pages project.
2.  Click **Set up a custom domain**.
3.  Enter your domain (e.g., `clipex.ai`) and follow the DNS configuration instructions.

## Troubleshooting

-   **Build Fails**: Check the build logs. If you see errors about `peer dependencies`, ensure `NPM_FLAGS` is set to `--legacy-peer-deps`.
-   **API Errors**: If the frontend cannot talk to the backend, check the browser console. Use the Network tab to see if requests to `NEXT_PUBLIC_RENDER_API_URL` are failing (CORS, 404, etc.).

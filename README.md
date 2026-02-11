# Clipex.ai

Clipex.ai is a professional, JSON-driven video template editor. It features a visual timeline editor where users can drag and drop videos, images, and text, and then render the result into a video file server-side.

## Features

-   **Visual Editor**: Drag-and-drop timeline interface.
-   **JSON-First**: Templates are stored as JSON, making them easy to manipulate programmatically.
-   **Server-Side Rendering**: High-quality rendering using FFmpeg on a VPS.
-   **Cloudflare Pages**: Fast, edge-deployed frontend.

## Documentation

-   [**Local Development**](docs/DEVELOPMENT.md): How to run the project on your machine.
-   [**Frontend Deployment**](docs/DEPLOY_FRONTEND.md): API on Cloudflare Pages.
-   [**VPS & Render Service Setup**](docs/SETUP_VPS.md): Setting up the rendering backend with Docker & FFmpeg.
-   [**API Reference**](docs/API_REFERENCE.md): Details on the Render Service API.

## Project Structure

-   `src/`: Main Next.js frontend code.
-   `render-service/`: Standalone Node.js/Express service for video processing.
-   `supabase/`: Database migrations and configuration.
-   `public/`: Static assets.

## Quick Start

1.  **Clone the repository**: `git clone ...`
2.  **Install Frontend**: `npm install`
3.  **Install Backend**: `cd render-service && npm install`
4.  **Run Locally**: See [Development Guide](docs/DEVELOPMENT.md).

## License

MIT

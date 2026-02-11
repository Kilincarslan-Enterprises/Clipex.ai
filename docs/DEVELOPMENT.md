# Local Development

Follow this guide to run the full Clipex.ai stack locally.

## Project Structure

The project builds upon two main components:

1.  **Frontend (`/`)**: Next.js application (React, Tailwind, Supabase Client).
2.  **Render Service (`/render-service`)**: Express.js application (FFmpeg).

## Prerequisites

-   Node.js 18+
-   Docker (optional, for running the render service in a container matching production)
-   Subapase project credentials

## Setup Steps

### 1. Frontend Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Copy `.env.example` to `.env.local` and fill in your details:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    NEXT_PUBLIC_RENDER_API_URL=http://localhost:3001 # Points to local render service
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

### 2. Render Service Setup

You have two options for running the render service locally:

#### Option A: Running with Node.js (Easiest)
Requires `ffmpeg` to be installed on your system.

1.  **Navigate to the directory**:
    ```bash
    cd render-service
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file:
    ```bash
    PORT=3001
    CORS_ORIGIN=http://localhost:3000
    ```

4.  **Start the service**:
    ```bash
    npm run dev
    ```
    The service will be available at `http://localhost:3001`.

#### Option B: Running with Docker (Production-like)
Does not require local FFmpeg installation.

1.  **Navigate to the directory**:
    ```bash
    cd render-service
    ```

2.  **Start with Docker Compose**:
    ```bash
    docker-compose up
    ```
    The service will be available at `http://localhost:3001`.

## Local Workflow

1.  Start the Render Service (Terminal 1) -> `http://localhost:3001`
2.  Start the Frontend (Terminal 2) -> `http://localhost:3000`
3.  Open `http://localhost:3000` in your browser.
4.  When you upload files or request a render, the frontend will talk to `localhost:3001`.

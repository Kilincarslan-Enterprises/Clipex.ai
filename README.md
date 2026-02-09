## Clipex.ai - Visual Video Template Editor

A professional video template editor where JSON is the single source of truth. Create, edit, and render video templates with a visual interface.

### Features

- **Visual Editor**: Drag-and-drop interface for building video templates
- **JSON-Driven**: All templates are stored as JSON for easy manipulation
- **Timeline**: Visual timeline with blocks for video, images, and text
- **Properties Panel**: Edit block properties (timing, position, styling)
- **Live Preview**: Real-time canvas preview with playback controls
- **Asset Management**: Upload and manage video/image assets
- **Placeholder System**: Use placeholders like `{{video_1}}` for dynamic content
- **Supabase Integration**: Persistent storage for templates
- **FFmpeg Rendering**: Server-side video rendering

### Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: Supabase
- **Video Processing**: FFmpeg (via fluent-ffmpeg)
- **Code Editor**: Monaco Editor
- **Deployment**: Cloudflare Pages (frontend), VPS (rendering)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd clipix.ai-new
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials

4. **Run Supabase migrations**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/20240209_init.sql`

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Create a new project and start editing!

### Project Structure

```
clipix.ai-new/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard (project list)
│   │   ├── editor/[id]/page.tsx  # Editor page
│   │   └── api/
│   │       ├── upload/           # File upload endpoint
│   │       └── render/           # Video rendering endpoint
│   ├── components/
│   │   ├── AssetsPanel.tsx       # Asset management
│   │   ├── CanvasPreview.tsx     # Video preview
│   │   ├── EditorPanel.tsx       # Main editor container
│   │   ├── JsonEditor.tsx        # Monaco JSON editor
│   │   ├── PropertiesPanel.tsx   # Block properties editor
│   │   └── Timeline.tsx          # Timeline view
│   ├── lib/
│   │   ├── store.ts              # Zustand global state
│   │   ├── supabase.ts           # Supabase client
│   │   └── utils.ts              # Utility functions
│   └── types/
│       ├── index.ts              # Core types
│       └── db.ts                 # Database types
├── supabase/
│   └── migrations/
│       └── 20240209_init.sql     # Initial database schema
├── public/
│   ├── uploads/                  # Uploaded assets
│   └── renders/                  # Rendered videos
└── package.json
```

### Database Schema

**projects** table:
- `id` (uuid, primary key)
- `name` (text)
- `data` (jsonb) - Stores template, assets, and placeholders
- `user_id` (uuid, optional)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Storage bucket**: `assets` (public)

### Deployment

#### Frontend (Cloudflare Pages)

1. **Build for Cloudflare Pages**
   ```bash
   npm run pages:build
   ```

2. **Deploy to Cloudflare Pages**
   - Connect your repository to Cloudflare Pages
   - Set build command: `npm run pages:build`
   - Set build output directory: `.vercel/output/static`
   - Add environment variables in Cloudflare dashboard
   - **Note**: If the build fails with detailed dependency errors, ensure `.npmrc` has `legacy-peer-deps=true` (I have already included this in the project).

**Note**: The `/api/render` route will not work on Cloudflare Pages due to FFmpeg binary limitations. You'll need to point to an external rendering service.

#### Rendering Service (VPS)

For production rendering, deploy the Next.js app to a VPS with FFmpeg installed:

1. **Install FFmpeg on your VPS**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install ffmpeg
   ```

2. **Deploy Next.js app**
   ```bash
   npm run build
   npm start
   ```

3. **Update environment variable**
   - Set `NEXT_PUBLIC_RENDER_API_URL` to your VPS endpoint in Cloudflare

### Development Notes

- **Local rendering**: Works out of the box with `ffmpeg-static`
- **Production rendering**: Requires external service or VPS
- **Asset storage**: Currently uses local filesystem; migrate to Supabase Storage for production
- **Authentication**: Not implemented; uses public access policies (update for production)

### License

MIT

### Support

For issues and questions, please open an issue on GitHub.

# Clipex.ai - Quick Start Guide

## 🚀 Local Development Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

**Create a Supabase project** at [supabase.com](https://supabase.com)

**Run the migration**:
1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the contents of `supabase/migrations/20240209_init.sql`
3. Click "Run"

**Get your credentials**:
1. Go to Project Settings → API
2. Copy your Project URL and anon/public key

### 3. Set Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📝 How to Use

### Creating Your First Project

1. **Dashboard**: Click "New Project" button
2. **Editor**: You'll be redirected to the editor
3. **Upload Assets**: Drag videos/images to the Assets panel
4. **Add Blocks**: Drag assets to the canvas to create blocks
5. **Edit Properties**: Select a block and edit in the Properties panel
6. **Preview**: Use the timeline playback controls
7. **Render**: Click "Render Video" to generate the final output

### Understanding the Interface

**3-Column Layout**:
- **Left (Assets)**: Upload and manage media files
- **Center (Editor)**: Visual canvas + timeline or JSON editor
- **Right (Properties)**: Edit selected block properties

**View Modes**:
- **Visual**: Canvas preview + timeline
- **JSON**: Direct JSON editing with Monaco Editor
- **Render**: View rendered video output

### Block Types

1. **Video**: Video clips with trim, position, scale
2. **Image**: Static images with position, scale
3. **Text**: Text overlays with font, color, background

### Placeholders

Use placeholders in your template:
```json
{
  "type": "video",
  "source": "{{video_1}}"
}
```

Then assign uploaded assets to placeholders in the Properties panel.

---

## 🎨 Template JSON Structure

```json
{
  "canvas": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },
  "timeline": [
    {
      "id": "unique-id",
      "type": "video",
      "source": "{{video_1}}",
      "start": 0,
      "duration": 5,
      "track": 0,
      "x": 0,
      "y": 0,
      "width": 1080,
      "height": 1920
    },
    {
      "id": "unique-id-2",
      "type": "text",
      "text": "Hello World",
      "start": 1,
      "duration": 3,
      "track": 1,
      "x": 100,
      "y": 100,
      "fontSize": 48,
      "color": "white",
      "backgroundColor": "rgba(0,0,0,0.5)"
    }
  ]
}
```

---

## 🔧 Common Tasks

### Adding a New Block Type

1. Update `src/types/index.ts` with new block type
2. Add rendering logic in `src/app/api/render/route.ts`
3. Update `src/components/CanvasPreview.tsx` for preview
4. Add properties in `src/components/PropertiesPanel.tsx`

### Changing Canvas Size

Edit in Properties panel or JSON:
```json
{
  "canvas": {
    "width": 1920,  // Change to desired width
    "height": 1080, // Change to desired height
    "fps": 30
  }
}
```

### Debugging Render Issues

1. Check browser console for errors
2. Check Next.js server logs
3. Verify FFmpeg is installed: `ffmpeg -version`
4. Check `public/renders/` directory for output

---

## 📦 Building for Production

### Standard Next.js Build
```bash
npm run build
npm start
```

### Cloudflare Pages Build
```bash
npm run pages:build
```

Output: `.vercel/output/static/`

**Note**: Rendering won't work on Cloudflare Pages. See `DEPLOYMENT.md` for VPS setup.

---

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
- Check `.env` file has correct credentials
- Verify Supabase project is active
- Check network connection

### "Render failed"
- Ensure FFmpeg is installed
- Check file paths in blocks
- Verify assets are uploaded
- Check server logs for FFmpeg errors

### "Assets not loading"
- Check `public/uploads/` directory exists
- Verify file upload completed successfully
- Check browser console for 404 errors

### "Auto-save not working"
- Check Supabase connection
- Verify project ID is valid
- Check browser console for errors

---

## 🎯 Keyboard Shortcuts

- **Space**: Play/Pause timeline
- **Delete**: Remove selected block
- **Ctrl+S**: Manual save (auto-saves every 2s)

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🆘 Need Help?

- Check `README.md` for detailed information
- See `DEPLOYMENT.md` for production deployment
- Open an issue on GitHub
- Contact support

---

**Happy editing! 🎬**

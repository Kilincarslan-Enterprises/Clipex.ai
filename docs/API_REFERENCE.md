# API Reference

The Clipex.ai platform exposes two APIs:

1. **Render Service API** — Direct access to the render backend (internal, not publicly accessible)
2. **Public API** — Authenticated endpoint routed through the frontend (recommended)

---

## Public API (v1)

**Base URL**: `https://your-frontend.com/api/v1`

### Authentication

All public API requests require an API key. Create keys in the Dashboard → **API Keys** tab.

Include the key in the `x-api-key` header:
```
x-api-key: ck_your_api_key_here
```

### POST `/api/v1/render`

Start a render job using a saved template with optional dynamic modifications.

**Headers**:
| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes | `application/json` |
| `x-api-key` | Yes | Your API key |

**Body**:
```json
{
  "template_id": "uuid-of-your-template",
  "modifications": {
    "template.duration": 30,
    "image_1.source": "https://example.com/photo.jpg",
    "image_1.duration": 5,
    "image_1.x": 100,
    "text_1.text": "Hello World",
    "text_1.subtitleSource": "https://example.com/subtitles.vtt",
    "slideshow_1.source": [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "https://example.com/img3.jpg"
    ]
  },
  "elements": [
    {
      "type": "text",
      "text": "Injected Text",
      "start": 2,
      "duration": 3,
      "track": 2,
      "fontSize": 48,
      "color": "#ffffff"
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `template_id` | string (UUID) | **Yes** | The ID of the template/project to render |
| `modifications` | object | No | Key-value pairs in `dynamicId.property` or `template.property` format |
| `elements` | array | No | New blocks to inject into the timeline |

**Modification Keys**:

Keys follow the format `<dynamicId>.<property>` for blocks, or `template.<property>` for template-level settings. The `dynamicId` is set in the Editor UI when you mark a field as dynamic (⚡). Available properties:

**Template-level** (`template.`):
| Property | Type | Description |
|---|---|---|
| `duration` | number | Total template duration in seconds. Blocks with missing `duration` will automatically inherit this value ("Auto" mode). |

**Block-level** (`<dynamicId>.`):
| Block Type | Available Properties |
|---|---|
| All | `start`, `duration`, `track`, `x`, `y`, `width` (string \| number, e.g. `"100%"`), `height` (string \| number, e.g. `"100%"`) |
| `video` / `image` | `source` |
| `text` | `text`, `fontSize`, `color`, `subtitleSource` |
| `audio` | `source`, `volume` |

> **Dynamic Array values:** If a block has `isDynamicArray: true` in the template, you can pass an **array** as the modification value instead of a single value (e.g. `"image_1.source": ["url1", "url2", "url3"]`). The single block will be expanded into N sequential blocks automatically. See [Dynamic Arrays](#dynamic-arrays) below.

**Response** (Success):
```json
{
  "jobId": "uuid-job-id",
  "statusUrl": "https://render-service.com/status/uuid-job-id",
  "message": "Render job started successfully"
}
```

**Response** (Error):
```json
{
  "error": "Description of what went wrong"
}
```

### Dynamic Arrays

Dynamic Arrays allow a single template block to generate multiple sequential blocks at render time. This is useful when the number of items (e.g. product images in a slideshow) is not known in advance.

**How it works:**
1. In the Editor, enable **Dynamic Array** on a block (e.g. an image block with `dynamicId: "slideshow_1"`).
2. Choose a **Duration Mode**:
   - `fixed_per_item` — Each generated block keeps the original duration. Total time extends with item count.
   - `divide_total` — The original block duration is split evenly across all items.
3. When calling the render API, pass an **array** as the modification value:

```json
{
  "template_id": "...",
  "modifications": {
    "slideshow_1.source": [
      "https://cdn.example.com/img1.jpg",
      "https://cdn.example.com/img2.jpg",
      "https://cdn.example.com/img3.jpg",
      "https://cdn.example.com/img4.jpg",
      "https://cdn.example.com/img5.jpg"
    ]
  }
}
```

**Result:** If the template block had `duration: 3s` and `durationMode: "fixed_per_item"`, this generates 5 image blocks of 3s each (total 15s), placed sequentially at `start=0, 3, 6, 9, 12`. All blocks inherit the same position, size, animations, and other presets from the original template block.

If `durationMode: "divide_total"`, the 3s are split: each image gets 0.6s.

> Subsequent blocks on the same track are automatically shifted forward if the expanded array exceeds the original block's duration.

### Polling Job Status

Use the `statusUrl` from the render response to poll for completion:

**GET** `<statusUrl>`

```json
{
  "id": "uuid-job-id",
  "status": "pending | processing | completed | failed",
  "progress": 50,
  "url": "/renders/render_uuid.mp4",
  "error": "Error message if failed"
}
```

---

## Render Service API (Internal)

**Base URL**: `https://your-render-service.com`

> ⚠️ This API is **not publicly accessible**. All requests must include a valid `X-Render-Access-Token` header. Use the Public API above for external integrations.

### Security

The render service validates every incoming request via the `X-Render-Access-Token` header. This token is shared between the frontend server and the render service.

### GET `/health`

Check if the service is running.

```json
{
  "status": "ok",
  "service": "clipex-render",
  "timestamp": "2024-02-11T12:00:00.000Z"
}
```

### POST `/render`

Start a video rendering job (internal format, full template JSON).

### GET `/status/:jobId`

Poll the status of a rendering job.

### GET `/renders/:filename`

Serves the final rendered video file.

---

## Example: CURL

```bash
curl -X POST \
  https://clipex-ai.kilincarslanenterprises.com/api/v1/render \
  -H "Content-Type: application/json" \
  -H "x-api-key: ck_abc123def456..." \
  -d '{
    "template_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "modifications": {
      "template.duration": 30,
      "image_1.source": "https://cdn.example.com/product.jpg",
      "image_1.duration": 4,
      "text_1.text": "Summer Sale 50% Off"
    }
  }'
```

## Example: n8n / HTTP Request Node

- **Method**: POST
- **URL**: `https://your-frontend.com/api/v1/render`
- **Headers**:
  - `Content-Type`: `application/json`
  - `x-api-key`: `ck_your_api_key_here`
- **Body**: JSON with `template_id` and `modifications`

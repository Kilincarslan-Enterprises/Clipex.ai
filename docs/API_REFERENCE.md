# API Reference

The Clipex.ai platform exposes two APIs:

1. **Render Service API** — Direct access to the render backend (internal)
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
    "image_1.source": "https://example.com/photo.jpg",
    "image_1.duration": 5,
    "text_1.text": "Hello World"
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
| `modifications` | object | No | Key-value pairs in `dynamicId.property` format |
| `elements` | array | No | New blocks to inject into the timeline |

**Modification Keys**:

Keys follow the format `<dynamicId>.<property>`. The `dynamicId` is set in the Editor UI when you mark a field as dynamic (⚡). Available properties depend on the block type:

| Block Type | Available Properties |
|---|---|
| `video` / `image` | `source`, `duration`, `x`, `y`, `width`, `height` |
| `text` | `text`, `duration`, `fontSize`, `color`, `backgroundColor` |
| `audio` | `source`, `duration`, `volume` |

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

**Base URL**: `https://your-render-service.com` (e.g., `https://api-clipex.kilincarslanenterprises.com`)

> ⚠️ This API has **no authentication**. Use the Public API above for external integrations.

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

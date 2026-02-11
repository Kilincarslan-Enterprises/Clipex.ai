# API Reference

The Render Service exposes a REST API for uploading assets and rendering video templates.

**Base URL**: `https://your-render-service.com` (e.g., `https://api-clipex.kilincarslanenterprises.com`)

## Endpoints

### 1. Health Check
Check if the service is running.

-   **GET** `/health`
-   **Response**:
    ```json
    {
      "status": "ok",
      "service": "clipex-render",
      "timestamp": "2024-02-11T12:00:00.000Z"
    }
    ```

### 2. Upload Asset
Upload video or image assets to be used in templates.

-   **POST** `/upload`
-   **Content-Type**: `multipart/form-data`
-   **Body**:
    -   `file`: The file to upload (Max 500MB)
-   **Response**:
    ```json
    {
      "url": "/uploads/uuid_filename.mp4",
      "filename": "uuid_filename.mp4"
    }
    ```

### 3. Render Video
Start a video rendering job.

-   **POST** `/render`
-   **Content-Type**: `application/json`
-   **Body**:
    ```json
    {
      "template": {
        "canvas": {
          "width": 1920,
          "height": 1080,
          "fps": 30
        },
        "timeline": [
          {
            "id": "block1",
            "type": "video", // or 'image', 'text'
            "source": "{{video_1}}", // Placeholder reference or direct URL
            "start": 0,
            "duration": 5,
            "track": 1,
            "x": 0,
            "y": 0,
             // ... other properties
          }
        ]
      },
      "assets": [
        {
          "id": "asset1",
          "name": "My Video",
          "type": "video",
          "url": "/uploads/..." 
        }
      ],
      "placeholders": {
        "video_1": "asset1" // Maps placeholder key to asset ID
      }
    }
    ```
-   **Response**:
    ```json
    {
      "jobId": "uuid-job-id"
    }
    ```

### 4. Check Job Status
Poll the status of a rendering job.

-   **GET** `/status/:jobId`
-   **Response**:
    ```json
    {
      "id": "uuid-job-id",
      "status": "pending" | "processing" | "completed" | "failed",
      "progress": 50, // 0-100
      "url": "/renders/render_uuid.mp4", // Available when status is 'completed'
      "error": "Error message if failed"
    }
    ```

### 5. Access Renders
Access the final video file.

-   **GET** `/renders/:filename`
-   **Description**: Serves the static video file.

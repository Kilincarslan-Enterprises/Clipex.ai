# JSON Editor Reference

Dieses Dokument beschreibt die vollständige JSON-Struktur für Video-Projekte und Templates im Editor. Diese Struktur wird in der Datenbank (`projects` Tabelle, `data` Spalte) gespeichert und kann für die programmatische Erstellung von Templates oder für direkte API-Anfragen genutzt werden.

## Übersicht der Struktur

Ein Template besteht aus drei Hauptkomponenten:
1. **Canvas**: Grundeinstellungen wie Auflösung und Framerate.
2. **Timeline**: Eine Liste aller Elemente (Videos, Texte, Bilder, Audio), die im Video erscheinen.
3. **Dynamic**: (Optional) Globale dynamische Einstellungen.

```json
{
  "canvas": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "duration": 30
  },
  "timeline": [
    // ... Liste der Blöcke
  ],
  "dynamic": {
    "dynamicFields": ["duration"]
  }
}
```

---

## 1. Canvas Settings (`canvas`)

Definiert die grundlegenden Eigenschaften des Ausgabevideos.

| Parameter | Typ | Beschreibung | Beispiel |
|---|---|---|---|
| `width` | number | Breite des Videos in Pixeln. Gängige Presets: 1080 (9:16, 1:1, 4:5) oder 1920 (16:9). | `1080` |
| `height` | number | Höhe des Videos in Pixeln. Gängige Presets: 1920 (9:16), 1080 (16:9), 1080 (1:1), 1350 (4:5). | `1920` |
| `fps` | number | Bilder pro Sekunde (Frames per Second). | `30` |
| `duration` | number | (Optional) Gesamtdauer des Templates in Sekunden. Wenn nicht gesetzt, ergibt sich die Dauer aus dem längsten Element. Blöcke mit fehlender `duration` erben diesen Wert automatisch. | `15` |

**Format-Presets im Editor:**
| Preset | Breite | Höhe | Verwendung |
|---|---|---|---|
| 9:16 | 1080 | 1920 | TikTok, Instagram Reels, YouTube Shorts |
| 16:9 | 1920 | 1080 | YouTube, Webseiten |
| 1:1 | 1080 | 1080 | Instagram Posts |
| 4:5 | 1080 | 1350 | Instagram Portrait Posts |

---

## 2. Timeline Elemente (`timeline`)

Die Timeline ist ein Array von Block-Objekten. Jeder Block repräsentiert ein visuelles oder auditives Element.

### Gemeinsame Parameter (Alle Typen)

Diese Parameter sind für **alle** Block-Typen (`video`, `image`, `text`, `audio`) verfügbar.

| Parameter | Typ | Pflicht? | Beschreibung |
|---|---|---|---|
| `id` | string | **Ja** | Eindeutige ID (UUID v4 empfohlen). |
| `type` | string | **Ja** | Typ des Elements: `'video'`, `'image'`, `'text'`, `'audio'`. |
| `track` | number | **Ja** | Die visuelle Ebene (Z-Index). Höhere Zahlen liegen weiter oben/vorne. |
| `start` | number | **Ja** | Startzeitpunkt in Sekunden auf der Timeline. |
| `duration`| number | Nein | Anzeigedauer in Sekunden. **Wenn leer/nicht gesetzt = "Auto"** – der Block erbt die `canvas.duration`. |
| `dynamicId` | string | Nein | Ein benutzerdefinierter ID-Name für API-Ersetzungen (z.B. `"product_image"`). |
| `dynamicFields` | string[] | Nein | Liste der Felder, die über die API änderbar sein sollen (z.B. `["source", "text"]`). |

### Visuelle Parameter (Video, Image, Text)

Diese Parameter gelten für alle sichtbaren Elemente.

| Parameter | Typ | Beschreibung | Standard |
|---|---|---|---|
| `x` | number | Horizontale Position (Pixel) von links. | `0` |
| `y` | number | Vertikale Position (Pixel) von oben. | `0` |
| `width` | string \| number | Breite: `"100%"` = volle Canvas-Breite, `"50%"` = halbe Breite, `"120%"` = gezoomt. Pixelwerte (z.B. `500`) auch möglich. | `"100%"` |
| `height` | string \| number | Höhe: `"100%"` = volle Canvas-Höhe. Prozent oder Pixel. | `"100%"` |

---

### Typ-spezifische Parameter

#### ➤ Video Block (`type: 'video'`)

| Parameter | Typ | Beschreibung |
|---|---|---|
| `source` | string | URL zur Videodatei (mp4, webm). |
| `volume` | number | Lautstärke (0 bis 100). |
| `loop` | boolean | Ob das Video geloopt werden soll, wenn es kürzer als die `duration` ist. |

#### ➤ Bild Block (`type: 'image'`)

| Parameter | Typ | Beschreibung |
|---|---|---|
| `source` | string | URL zur Bilddatei (jpg, png, webp). |

#### ➤ Text Block (`type: 'text'`)

| Parameter | Typ | Beschreibung |
|---|---|---|
| `text` | string | Der anzuzeigende Textinhalt. |
| `fontSize` | number | Schriftgröße in Pixeln. |
| `color` | string | Textfarbe als Hex-Code (z.B. `"#ffffff"`). |
| `backgroundColor` | string | Hintergrundfarbe der Textbox (z.B. `"#000000"`). |
| `subtitleEnabled` | boolean | Wenn `true`, verhält sich dieser Block als Untertitel-Generator. |
| `subtitleSource` | string | URL zu einer `.vtt` Datei oder VTT-Inhalt als String. |
| `subtitleStyleId` | string | ID eines anderen Textblocks, dessen Stil kopiert werden soll. |

#### ➤ Audio Block (`type: 'audio'`)

Audio-Blöcke haben keine visuellen Positionsparameter (`x`, `y`, `width`, `height`).

| Parameter | Typ | Beschreibung |
|---|---|---|
| `source` | string | URL zur Audiodatei (mp3, wav). |
| `volume` | number | Lautstärke (0 bis 100). |
| `loop` | boolean | Ob das Audio geloopt werden soll. |

---

## 3. Animationen (`animations`)

Jeder sichtbare Block (`video`, `image`, `text`) kann ein Array von Animationen haben. Animationen werden relativ zum Startpunkt des Blocks getimed.

### Gemeinsame Animations-Parameter

| Parameter | Typ | Pflicht? | Beschreibung |
|---|---|---|---|
| `id` | string | **Ja** | Eindeutige ID der Animation (UUID v4). |
| `type` | string | **Ja** | Typ: `shake`, `fade_in`, `fade_out`, `slide_in`, `slide_out`, `scale`, `rotate`, `bounce`, `pulse`. |
| `time` | number | **Ja** | Startzeitpunkt relativ zum Block-Start (Sekunden). |
| `duration` | number | **Ja** | Dauer der Animation (Sekunden). |
| `easing` | string | Nein | Easing-Funktion: `linear`, `ease_in`, `ease_out`, `ease_in_out`, `bounce`. Standard: `ease_in_out`. |

### Typ-spezifische Parameter

| Animation | Parameter | Typ | Beschreibung | Standard |
|---|---|---|---|---|
| `shake` | `strength` | number | Pixel-Auslenkung | `10` |
| `shake` | `frequency` | number | Schwingungen pro Sekunde | `8` |
| `slide_in` / `slide_out` | `direction` | string | Richtung: `left`, `right`, `top`, `bottom` | `left` |
| `scale` | `startScale` | number | Anfangsskalierung | `0` |
| `scale` | `endScale` | number | Endskalierung | `1` |
| `rotate` | `angle` | number | Rotationswinkel in Grad | `360` |
| `rotate` | `rotateDirection` | string | Richtung: `cw` (im Uhrzeigersinn), `ccw` | `cw` |
| `bounce` | `strength` | number | Sprunghöhe in Pixeln | `20` |
| `bounce` | `frequency` | number | Anzahl der Sprünge | `3` |
| `pulse` | `strength` | number | Pulsintensität (0.0 – 1.0) | `0.2` |
| `pulse` | `frequency` | number | Anzahl der Pulse | `2` |

### Beispiel: Block mit Animationen

```json
{
  "id": "main-title",
  "type": "text",
  "track": 2,
  "start": 0.5,
  "duration": 5,
  "x": 100,
  "y": 200,
  "text": "Willkommen",
  "fontSize": 80,
  "color": "#ffffff",
  "animations": [
    {
      "id": "anim-1",
      "type": "fade_in",
      "time": 0,
      "duration": 0.5,
      "easing": "ease_out"
    },
    {
      "id": "anim-2",
      "type": "slide_in",
      "time": 0,
      "duration": 0.8,
      "direction": "left",
      "easing": "ease_in_out"
    },
    {
      "id": "anim-3",
      "type": "shake",
      "time": 2,
      "duration": 1,
      "strength": 5,
      "frequency": 10
    }
  ]
}
```

---

## 4. Nutzung via JSON / API

Sie können dieses JSON-Format verwenden, um Templates programmatisch zu erstellen oder existierende Templates über die API zu modifizieren.

### API Modifikationen (`modifications`)

Wenn Sie die Render-API (`/api/v1/render`) nutzen, können Sie Werte im JSON über die `dynamicId` überschreiben.

**Beispiel:**
Wenn Sie einen Text-Block mit `"dynamicId": "headline"` haben:
```json
// Im Template:
{
  "type": "text",
  "dynamicId": "headline",
  "text": "Original Titel",
  ...
}
```

Können Sie diesen beim Rendern ändern:
```json
// Im API Request:
{
  "modifications": {
    "headline.text": "Neuer dynamischer Titel",
    "headline.color": "#ff0000"
  }
}
```

### Vollständiges Beispiel-JSON

```json
{
  "canvas": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "duration": 10
  },
  "timeline": [
    {
      "id": "bg-video-1",
      "type": "video",
      "track": 1,
      "start": 0,
      "duration": 10,
      "x": 0,
      "y": 0,
      "width": "100%",
      "height": "100%",
      "source": "https://example.com/background.mp4",
      "volume": 0,
      "loop": true
    },
    {
      "id": "main-title",
      "type": "text",
      "track": 2,
      "start": 0.5,
      "duration": 5,
      "x": 100,
      "y": 200,
      "width": "80%",
      "height": 200,
      "text": "Willkommen bei Clipix",
      "fontSize": 80,
      "color": "#ffffff",
      "dynamicId": "title_text",
      "dynamicFields": ["text", "color"]
    },
    {
      "id": "logo-img",
      "type": "image",
      "track": 3,
      "start": 8,
      "duration": 2,
      "x": 390,
      "y": 810,
      "width": "30%",
      "height": "15%",
      "source": "https://example.com/logo.png"
    }
  ],
  "dynamic": {
    "dynamicFields": ["duration"]
  }
}
```

import type { SubtitleCue } from '@/types';

/**
 * Parse a WebVTT timestamp string (e.g. "00:01:23.456" or "01:23.456") to seconds.
 */
function parseTimestamp(ts: string): number {
    const parts = ts.trim().split(':');
    if (parts.length === 3) {
        // HH:MM:SS.mmm
        const hours = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        const secs = parseFloat(parts[2]);
        return hours * 3600 + mins * 60 + secs;
    }
    if (parts.length === 2) {
        // MM:SS.mmm
        const mins = parseInt(parts[0], 10);
        const secs = parseFloat(parts[1]);
        return mins * 60 + secs;
    }
    return parseFloat(ts) || 0;
}

/**
 * Normalize VTT input that may come as a JSON-encoded string (e.g. from API).
 * When VTT passes through JSON.stringify / JSON.parse, newlines become literal
 * two-character sequences `\n` instead of real newline characters.
 * This function detects that and converts them back.
 */
function normalizeVttInput(raw: string): string {
    // 1. If it looks like a JSON string (starts with "), try to parse it
    const trimmed = raw.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === 'string') return parsed;
        } catch { /* not valid JSON, continue */ }
    }

    // 2. If there are no real newlines but there are literal \n sequences,
    //    the content was likely JSON-escaped without wrapping quotes.
    if (!raw.includes('\n') && raw.includes('\\n')) {
        return raw
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n');
    }

    return raw;
}

/**
 * Parse a WebVTT string into an array of SubtitleCue objects.
 * Supports standard WEBVTT format with optional cue identifiers.
 * Also accepts JSON-stringified VTT (where newlines are escaped as \n).
 */
export function parseVtt(vttString: string): SubtitleCue[] {
    if (!vttString || !vttString.trim()) return [];

    // Handle JSON-encoded input (literal \n instead of real newlines)
    const normalized = normalizeVttInput(vttString);

    const cues: SubtitleCue[] = [];
    // Normalize line endings
    const lines = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    let i = 0;

    // Skip WEBVTT header line (and any header metadata)
    if (lines[0]?.trim().startsWith('WEBVTT')) {
        i = 1;
        // Skip any lines until first blank line (header block)
        while (i < lines.length && lines[i].trim() !== '') {
            i++;
        }
    }

    while (i < lines.length) {
        // Skip blank lines
        if (lines[i].trim() === '') {
            i++;
            continue;
        }

        // Check if this line is a timestamp line (contains "-->")
        let timestampLine = lines[i];
        if (!timestampLine.includes('-->')) {
            // This might be a cue identifier – skip it and check next line
            i++;
            if (i < lines.length) {
                timestampLine = lines[i];
            } else {
                break;
            }
        }

        if (!timestampLine.includes('-->')) {
            // Not a valid cue block, skip
            i++;
            continue;
        }

        // Parse timestamp line: "00:00.000 --> 00:05.000"
        const [startStr, endStr] = timestampLine.split('-->').map((s) => s.trim());
        const start = parseTimestamp(startStr);
        const end = parseTimestamp(endStr);
        i++;

        // Collect text lines until blank line or end
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '') {
            textLines.push(lines[i].trim());
            i++;
        }

        if (textLines.length > 0) {
            cues.push({
                start,
                end,
                text: textLines.join('\n'),
            });
        }
    }

    return cues;
}

/**
 * Find the active subtitle cue for a given time (in seconds).
 * Returns the cue text or empty string if no cue is active.
 */
export function getActiveCueText(cues: SubtitleCue[], time: number): string {
    for (const cue of cues) {
        if (time >= cue.start && time < cue.end) {
            return cue.text;
        }
    }
    return '';
}

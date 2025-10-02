import { Track } from '../types';

/**
 * Escapes a value for CSV format. If the value contains a comma, double quote, or newline,
 * it wraps the value in double quotes and escapes existing double quotes.
 * @param value The value to escape.
 * @returns The escaped string.
 */
const escapeCsvValue = (value: any): string => {
  const str = String(value === null || value === undefined ? '' : value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Converts an array of Track objects to a CSV formatted string.
 * @param tracks The array of tracks to convert.
 * @returns A string in CSV format.
 */
export const exportToCSV = (tracks: Track[]): string => {
  if (tracks.length === 0) {
    return '';
  }

  const headers = [
    'id', 'name', 'path', 'genre', 'mood', 'key', 'bpm', 'notes',
    'status_mixed', 'status_mastered', 'status_tagged', 'status_registered'
  ];

  const rows = tracks.map(track => [
    track.id,
    track.name,
    track.path,
    track.genre,
    track.mood,
    track.key,
    track.bpm,
    track.notes,
    track.status.mixed,
    track.status.mastered,
    track.status.tagged,
    track.status.registered
  ].map(escapeCsvValue).join(','));

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Converts an array of Track objects to a JSON formatted string.
 * @param tracks The array of tracks to convert.
 * @returns A prettified JSON string.
 */
export const exportToJSON = (tracks: Track[]): string => {
  return JSON.stringify(tracks, null, 2);
};
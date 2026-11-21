/**
 * Base des appels API.
 *  - Web / Docker : vide → chemins relatifs (`/api/...`), comportement inchangé.
 *  - APK Android : l'appli est servie depuis https://localhost (WebView) ; il faut donc l'adresse
 *    du serveur Kairn, fixée à la compilation par VITE_API_BASE_URL (ex. https://mon-pc.tailnet.ts.net).
 */
const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export const API_BASE = raw.trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

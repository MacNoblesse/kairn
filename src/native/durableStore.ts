import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

/**
 * Miroir durable de l'état dans le stockage NATIF Android (SharedPreferences), en plus du
 * localStorage de la WebView. Le localStorage survit aux redémarrages de l'appli, mais Android peut
 * vider les données web de la WebView ; le stockage natif est un filet de sécurité hors ligne.
 * Sur le web (Docker), ces fonctions ne font rien.
 */
const STATE_KEY = 'kairn_state_mirror_v1';

export async function mirrorState(json: string): Promise<void> {
  if (!isNative) return;
  try {
    await Preferences.set({ key: STATE_KEY, value: json });
  } catch {
    // best effort : le serveur et le localStorage restent les sources principales
  }
}

export async function readMirroredState(): Promise<string | null> {
  if (!isNative) return null;
  try {
    return (await Preferences.get({ key: STATE_KEY })).value;
  } catch {
    return null;
  }
}

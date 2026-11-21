import { Capacitor } from '@capacitor/core';

/** Vrai uniquement dans l'APK (WebView Capacitor), faux sur le web / Docker. */
export const isNative: boolean = Capacitor.isNativePlatform();

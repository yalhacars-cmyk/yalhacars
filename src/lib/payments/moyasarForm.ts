/**
 * Loader for Moyasar's Payment Form (moyasar.js) — the officially embeddable
 * card widget that tokenizes card details in-page, so raw card data never
 * touches our own code. Loaded from Moyasar's CDN on demand (checkout page
 * only) rather than bundled, since it's not published as an npm module.
 *
 * https://docs.moyasar.com/guides/card-payments/min-integration/
 */

const MOYASAR_FORM_VERSION = "1.19.0";
const MOYASAR_CDN_BASE = `https://cdn.moyasar.com/mpf/${MOYASAR_FORM_VERSION}`;

declare global {
  interface Window {
    Moyasar?: { init: (config: Record<string, unknown>) => void };
  }
}

let loadPromise: Promise<void> | null = null;

export function loadMoyasarForm(): Promise<void> {
  if (window.Moyasar) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MOYASAR_CDN_BASE}/moyasar.css"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${MOYASAR_CDN_BASE}/moyasar.css`;
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = `${MOYASAR_CDN_BASE}/moyasar.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Moyasar payment form"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

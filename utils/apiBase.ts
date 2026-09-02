// The default dpc-api dev-portal origin used when NEXT_PUBLIC_API_URL is not
// set (documented in CONFIG.md).
export const DEFAULT_API_BASE_URL = 'http://localhost:45345';

// Resolve the dpc-api base URL. A function rather than a module-scope
// constant so tests can stub NEXT_PUBLIC_API_URL per test — the same reason
// services/visitService.ts's getBaseUrl() is a getter.
//
// The browser and the Next.js server do not always reach dpc-api at the same
// address. Under the shipped Compose stack a visitor's browser reaches it on
// the published host port (http://localhost:45345) while the website container
// reaches it on the Compose network as http://dpc-api:8080, and no single
// NEXT_PUBLIC_* value can name both. DPC_API_INTERNAL_URL names the second one:
// it is read only while rendering on the server, and falls back to the public
// URL when unset, so a deployment whose API answers at one origin from both
// sides needs no second variable. Being server-only it is a runtime value
// rather than a build-time inline, so changing it does not need an image
// rebuild. Documented in CONFIG.md.
export const getApiBaseUrl = (): string => {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
    if (typeof window === 'undefined') {
        return process.env.DPC_API_INTERNAL_URL || publicUrl;
    }
    return publicUrl;
};

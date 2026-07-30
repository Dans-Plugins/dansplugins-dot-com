// The default dpc-api dev-portal origin used when NEXT_PUBLIC_API_URL is not
// set (documented in CONFIG.md).
export const DEFAULT_API_BASE_URL = 'http://localhost:45345';

// Resolve the dpc-api base URL. A function rather than a module-scope
// constant so tests can stub NEXT_PUBLIC_API_URL per test — the same reason
// services/visitService.ts's getBaseUrl() is a getter.
export const getApiBaseUrl = (): string => process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;

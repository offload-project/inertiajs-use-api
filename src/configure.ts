export interface UseApiConfig {
	/** Prepended to relative URLs (e.g. "/api"). Absolute URLs pass through. */
	baseUrl?: string;
	/** Merged onto every request before per-call headers. */
	defaultHeaders?: Record<string, string>;
	/**
	 * Reads the CSRF token. Defaults to decoding the `XSRF-TOKEN` cookie.
	 * Return `null` for no token.
	 */
	getXsrfToken?: () => string | null;
	/** Header name for the CSRF token. Defaults to `X-XSRF-TOKEN`. */
	xsrfHeaderName?: string;
	/**
	 * Parses the response body into a flat `{ field: message }` map on a non-2xx response.
	 * If unset, no field errors are populated.
	 */
	parseErrors?: (body: unknown, status: number) => Record<string, string>;
	/**
	 * Extracts a human-readable error message from the body (used as the default error toast).
	 */
	parseMessage?: (body: unknown, status: number) => string | null;
	/** Invoked with the `successToast` value the caller passed. */
	onSuccessToast?: (toast: unknown) => void;
	/** Invoked with the resolved error toast value (caller's or the fallback message). */
	onErrorToast?: (toast: unknown) => void;
	/**
	 * Inspect every response body (after JSON parse) regardless of status.
	 * Useful for pulling out server-side toast envelopes.
	 */
	onResponse?: (body: unknown, status: number, ok: boolean) => void;
}

const config: UseApiConfig = {};

export function configureUseApi(next: UseApiConfig): void {
	Object.assign(config, next);
}

export function getUseApiConfig(): UseApiConfig {
	return config;
}

export function resetUseApiConfig(): void {
	for (const key of Object.keys(config) as (keyof UseApiConfig)[]) {
		delete config[key];
	}
}

function defaultXsrfReader(): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
	return match && match[1] !== undefined ? decodeURIComponent(match[1]) : null;
}

export function readXsrfToken(): string | null {
	return (config.getXsrfToken ?? defaultXsrfReader)();
}

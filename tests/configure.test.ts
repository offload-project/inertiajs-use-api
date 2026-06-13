import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureUseApi, getUseApiConfig, readXsrfToken, resetUseApiConfig } from "../src/configure.js";

describe("configureUseApi", () => {
	afterEach(() => {
		resetUseApiConfig();
	});

	it("merges fields onto the global config", () => {
		configureUseApi({ baseUrl: "/api" });
		configureUseApi({ xsrfHeaderName: "X-CSRF-TOKEN" });

		const config = getUseApiConfig();
		expect(config.baseUrl).toBe("/api");
		expect(config.xsrfHeaderName).toBe("X-CSRF-TOKEN");
	});

	it("resetUseApiConfig clears all fields", () => {
		configureUseApi({
			baseUrl: "/api",
			parseErrors: () => ({ name: "bad" }),
			onSuccessToast: vi.fn(),
		});

		resetUseApiConfig();

		expect(getUseApiConfig()).toEqual({});
	});
});

describe("readXsrfToken", () => {
	beforeEach(() => {
		// biome-ignore lint/suspicious/noDocumentCookie: test cookie
		document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
	});

	afterEach(() => {
		resetUseApiConfig();
		// biome-ignore lint/suspicious/noDocumentCookie: test cookie
		document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
	});

	it("decodes the XSRF-TOKEN cookie by default", () => {
		// biome-ignore lint/suspicious/noDocumentCookie: test cookie
		document.cookie = `XSRF-TOKEN=${encodeURIComponent("abc=123")}`;
		expect(readXsrfToken()).toBe("abc=123");
	});

	it("returns null when no cookie is set", () => {
		expect(readXsrfToken()).toBeNull();
	});

	it("uses a custom getXsrfToken override", () => {
		configureUseApi({ getXsrfToken: () => "custom-token" });
		expect(readXsrfToken()).toBe("custom-token");
	});
});

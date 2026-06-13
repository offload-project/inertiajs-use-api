import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@inertiajs/core", () => ({
	router: {
		replaceProp: vi.fn(),
		reload: vi.fn(),
	},
}));

import { router } from "@inertiajs/core";

import { configureUseApi, resetUseApiConfig } from "../src/configure.js";
import { ApiError } from "../src/errors.js";
import { useApi } from "../src/use-api.js";

type JsonInit = {
	status?: number;
	contentType?: string | null;
	body?: unknown;
};

function jsonResponse({ status = 200, contentType = "application/json", body = {} }: JsonInit = {}): Response {
	const headers = new Headers();
	if (contentType) headers.set("Content-Type", contentType);
	return new Response(body === null ? null : JSON.stringify(body), {
		status,
		headers,
	});
}

beforeEach(() => {
	resetUseApiConfig();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useApi - happy path", () => {
	it("returns parsed JSON on GET and sets wasSuccessful/status/response", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: { items: [1, 2, 3] } }));

		const { result } = renderHook(() => useApi<Record<string, never>, { items: number[] }>({}));

		await act(async () => {
			const data = await result.current.get("/api/items");
			expect(data).toEqual({ items: [1, 2, 3] });
		});

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe("/api/items");
		expect((init as RequestInit).method).toBe("GET");
		expect(result.current.response).toEqual({ items: [1, 2, 3] });
		expect(result.current.wasSuccessful).toBe(true);
		expect(result.current.status).toBe(200);
		expect(result.current.processing).toBe(false);
		expect(result.current.hasErrors).toBe(false);
	});

	it("sends merged data as JSON body on POST", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: 201, body: { id: 7 } }));

		const { result } = renderHook(() => useApi<{ name: string; role: string }>({ name: "ada", role: "" }));

		await act(async () => {
			await result.current.post("/api/users", { data: { role: "admin" } });
		});

		const init = fetchMock.mock.calls[0]![1] as RequestInit;
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({
			name: "ada",
			role: "admin",
		});
		expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
	});

	it("appends query params and skips null/undefined", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: {} }));

		const { result } = renderHook(() => useApi());

		await act(async () => {
			await result.current.get("/api/search", {
				params: { q: "test", page: 2, skip: null, drop: undefined },
			});
		});

		expect(fetchMock.mock.calls[0]![0]).toBe("/api/search?q=test&page=2");
	});

	it("applies baseUrl from global config", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: {} }));

		configureUseApi({ baseUrl: "https://api.example.com" });

		const { result } = renderHook(() => useApi());
		await act(async () => {
			await result.current.get("/v1/me");
		});

		expect(fetchMock.mock.calls[0]![0]).toBe("https://api.example.com/v1/me");
	});

	it("calls lifecycle hooks in order on success", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: { ok: true } }));

		const calls: string[] = [];
		const { result } = renderHook(() => useApi());

		await act(async () => {
			await result.current.get("/x", {
				onBefore: () => calls.push("before"),
				onSuccess: () => calls.push("success"),
				onError: () => calls.push("error"),
				onFinish: () => calls.push("finish"),
			});
		});

		expect(calls).toEqual(["before", "success", "finish"]);
	});
});

describe("useApi - error handling", () => {
	it("populates errors via configured parseErrors and throws ApiError", async () => {
		configureUseApi({
			parseErrors: (body) => {
				const errs = (body as { errors: Record<string, string[]> }).errors;
				const flat: Record<string, string> = {};
				for (const [k, v] of Object.entries(errs)) flat[k] = v[0]!;
				return flat;
			},
			parseMessage: (body) => (body as { message?: string }).message ?? null,
		});

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			jsonResponse({
				status: 422,
				body: {
					message: "Invalid",
					errors: { name: ["Name is required"] },
				},
			}),
		);

		const { result } = renderHook(() => useApi<{ name: string }>({ name: "" }));

		let thrown: unknown;
		await act(async () => {
			try {
				await result.current.post("/api/users");
			} catch (e) {
				thrown = e;
			}
		});

		expect(thrown).toBeInstanceOf(ApiError);
		expect((thrown as ApiError).status).toBe(422);
		expect((thrown as ApiError).message).toBe("Invalid");
		expect(result.current.errors).toEqual({ name: "Name is required" });
		expect(result.current.hasErrors).toBe(true);
		expect(result.current.wasSuccessful).toBe(false);
		expect(result.current.status).toBe(422);
	});

	it("falls back to status message when parseMessage is not configured", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: 500, body: {} }));

		const { result } = renderHook(() => useApi());

		let thrown: ApiError | undefined;
		await act(async () => {
			try {
				await result.current.get("/x");
			} catch (e) {
				thrown = e as ApiError;
			}
		});

		expect(thrown?.message).toBe("Request failed (500)");
	});

	it("propagates network errors", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));

		const { result } = renderHook(() => useApi());

		let thrown: unknown;
		await act(async () => {
			try {
				await result.current.get("/x");
			} catch (e) {
				thrown = e;
			}
		});

		expect(thrown).toBeInstanceOf(TypeError);
		expect(result.current.processing).toBe(false);
	});
});

describe("useApi - cancellation", () => {
	it("cancel() aborts in-flight requests", async () => {
		let signalRef: AbortSignal | undefined;
		vi.spyOn(globalThis, "fetch").mockImplementation(
			(_url, init) =>
				new Promise((_resolve, reject) => {
					signalRef = (init as RequestInit).signal as AbortSignal;
					signalRef.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
				}),
		);

		const { result } = renderHook(() => useApi());

		const pending = act(async () => {
			try {
				await result.current.get("/x");
			} catch {
				/* expected */
			}
		});

		await waitFor(() => expect(signalRef).toBeDefined());

		act(() => {
			result.current.cancel();
		});

		await pending;
		expect(signalRef!.aborted).toBe(true);
		expect(result.current.processing).toBe(false);
	});
});

describe("useApi - Inertia prop integration", () => {
	it("intoProp as string calls router.replaceProp with the response", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: { users: [{ id: 1 }] } }));

		const { result } = renderHook(() => useApi());

		await act(async () => {
			await result.current.get("/api/users", { intoProp: "users" });
		});

		expect(router.replaceProp).toHaveBeenCalledOnce();
		const [name, valueFn] = vi.mocked(router.replaceProp).mock.calls[0]!;
		expect(name).toBe("users");
		expect((valueFn as () => unknown)()).toEqual({ users: [{ id: 1 }] });
	});

	it("intoProp as function maps response into multiple props", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			jsonResponse({
				body: { users: [1], stats: { count: 1 } },
			}),
		);

		const { result } = renderHook(() =>
			useApi<Record<string, never>, { users: number[]; stats: { count: number } }>({}),
		);

		await act(async () => {
			await result.current.get("/api/dashboard", {
				intoProp: (res) => ({ users: res.users, stats: res.stats }),
			});
		});

		expect(router.replaceProp).toHaveBeenCalledTimes(2);
		const calls = vi.mocked(router.replaceProp).mock.calls;
		expect(calls[0]![0]).toBe("users");
		expect((calls[0]![1] as () => unknown)()).toEqual([1]);
		expect(calls[1]![0]).toBe("stats");
		expect((calls[1]![1] as () => unknown)()).toEqual({ count: 1 });
	});

	it("reloadProps triggers router.reload with `only`", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: {} }));

		const { result } = renderHook(() => useApi());

		await act(async () => {
			await result.current.post("/api/users", {
				reloadProps: ["users", "stats"],
			});
		});

		expect(router.reload).toHaveBeenCalledOnce();
		expect(vi.mocked(router.reload).mock.calls[0]![0]).toEqual({
			only: ["users", "stats"],
		});
	});

	it("reloadProps accepts a single string", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: {} }));

		const { result } = renderHook(() => useApi());

		await act(async () => {
			await result.current.post("/x", { reloadProps: "users" });
		});

		expect(vi.mocked(router.reload).mock.calls[0]![0]).toEqual({
			only: ["users"],
		});
	});

	it("does not call router on a failed request", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: 422, body: {} }));

		const { result } = renderHook(() => useApi());

		await act(async () => {
			try {
				await result.current.post("/x", {
					intoProp: "users",
					reloadProps: "users",
				});
			} catch {
				/* expected */
			}
		});

		expect(router.replaceProp).not.toHaveBeenCalled();
		expect(router.reload).not.toHaveBeenCalled();
	});
});

describe("useApi - toast handlers", () => {
	it("invokes onSuccessToast with the per-call value", async () => {
		const onSuccessToast = vi.fn();
		configureUseApi({ onSuccessToast });

		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: {} }));

		const { result } = renderHook(() => useApi());
		await act(async () => {
			await result.current.post("/x", { successToast: "Saved!" });
		});

		expect(onSuccessToast).toHaveBeenCalledWith("Saved!");
	});

	it("invokes onErrorToast with parsed message as fallback", async () => {
		const onErrorToast = vi.fn();
		configureUseApi({
			onErrorToast,
			parseMessage: () => "Server exploded",
		});

		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: 500, body: {} }));

		const { result } = renderHook(() => useApi());
		await act(async () => {
			try {
				await result.current.post("/x");
			} catch {
				/* expected */
			}
		});

		expect(onErrorToast).toHaveBeenCalledWith("Server exploded");
	});

	it("errorToast: false suppresses the error toast", async () => {
		const onErrorToast = vi.fn();
		configureUseApi({ onErrorToast, parseMessage: () => "nope" });

		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: 422, body: {} }));

		const { result } = renderHook(() => useApi());
		await act(async () => {
			try {
				await result.current.post("/x", { errorToast: false });
			} catch {
				/* expected */
			}
		});

		expect(onErrorToast).not.toHaveBeenCalled();
	});
});

describe("useApi - state helpers", () => {
	it("setData merges fields", () => {
		const { result } = renderHook(() => useApi<{ name: string; age: number }>({ name: "", age: 0 }));

		act(() => {
			result.current.setData("name", "ada");
		});
		expect(result.current.data).toEqual({ name: "ada", age: 0 });

		act(() => {
			result.current.setData({ age: 36 });
		});
		expect(result.current.data).toEqual({ name: "ada", age: 36 });
	});

	it("reset restores initial data and clears state", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: { ok: true } }));

		const { result } = renderHook(() => useApi<{ name: string }>({ name: "ada" }));

		await act(async () => {
			await result.current.get("/x");
		});
		act(() => {
			result.current.setData("name", "babbage");
		});

		expect(result.current.data).toEqual({ name: "babbage" });
		expect(result.current.response).toEqual({ ok: true });

		act(() => {
			result.current.reset();
		});

		expect(result.current.data).toEqual({ name: "ada" });
		expect(result.current.response).toBeNull();
		expect(result.current.wasSuccessful).toBe(false);
		expect(result.current.status).toBeNull();
	});

	it("clearErrors empties the errors map", async () => {
		configureUseApi({ parseErrors: () => ({ name: "bad" }) });
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: 422, body: {} }));

		const { result } = renderHook(() => useApi());
		await act(async () => {
			try {
				await result.current.post("/x");
			} catch {
				/* expected */
			}
		});

		expect(result.current.hasErrors).toBe(true);
		act(() => {
			result.current.clearErrors();
		});
		expect(result.current.hasErrors).toBe(false);
	});
});

describe("useApi - headers", () => {
	it("adds XSRF token from cookie to headers", async () => {
		// biome-ignore lint/suspicious/noDocumentCookie: test cookie
		document.cookie = `XSRF-TOKEN=${encodeURIComponent("tkn")}`;
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: {} }));

		const { result } = renderHook(() => useApi());
		await act(async () => {
			await result.current.post("/x");
		});

		const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
		expect(headers["X-XSRF-TOKEN"]).toBe("tkn");

		// biome-ignore lint/suspicious/noDocumentCookie: test cookie
		document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
	});

	it("merges defaultHeaders, then per-call headers override", async () => {
		configureUseApi({
			defaultHeaders: { "X-Default": "1", Accept: "text/plain" },
		});
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ body: {} }));

		const { result } = renderHook(() => useApi());
		await act(async () => {
			await result.current.get("/x", { headers: { "X-Default": "2" } });
		});

		const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
		expect(headers["X-Default"]).toBe("2");
		expect(headers.Accept).toBe("text/plain");
	});
});

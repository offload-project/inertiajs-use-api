import { router } from "@inertiajs/core";
import { useCallback, useRef, useState } from "react";

import { getUseApiConfig, readXsrfToken } from "./configure.js";
import { ApiError } from "./errors.js";
import type { FieldErrors, Method, QueryParams, SubmitOptions, UseApi } from "./types.js";

function appendQuery(url: string, params?: QueryParams): string {
	if (!params) return url;
	const usp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined) continue;
		usp.append(key, String(value));
	}
	const qs = usp.toString();
	if (!qs) return url;
	return url + (url.includes("?") ? "&" : "?") + qs;
}

function resolveUrl(url: string, baseUrl?: string): string {
	if (!baseUrl) return url;
	if (/^https?:\/\//i.test(url)) return url;
	return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
	const lower = name.toLowerCase();
	return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}

export function useApi<TForm extends object = Record<string, unknown>, TResponse = unknown>(
	initialData: TForm = {} as TForm,
): UseApi<TForm, TResponse> {
	const initialRef = useRef(initialData);
	const [data, setDataState] = useState<TForm>(initialData);
	const [errors, setErrors] = useState<FieldErrors<TForm>>({});
	const [processing, setProcessing] = useState(false);
	const [response, setResponse] = useState<TResponse | null>(null);
	const [wasSuccessful, setWasSuccessful] = useState(false);
	const [status, setStatus] = useState<number | null>(null);
	const inFlightRef = useRef<Set<AbortController>>(new Set());

	const setData = useCallback<UseApi<TForm, TResponse>["setData"]>((field, value) => {
		setDataState((prev) =>
			typeof field === "object" ? { ...prev, ...(field as Partial<TForm>) } : { ...prev, [field]: value },
		);
	}, []);

	const reset = useCallback(() => {
		setDataState(initialRef.current);
		setErrors({});
		setResponse(null);
		setWasSuccessful(false);
		setStatus(null);
	}, []);

	const clearErrors = useCallback(() => setErrors({}), []);

	const cancel = useCallback(() => {
		for (const controller of inFlightRef.current) {
			controller.abort();
		}
		inFlightRef.current.clear();
	}, []);

	const submit = useCallback<UseApi<TForm, TResponse>["submit"]>(
		async (method, url, options = {}) => {
			const config = getUseApiConfig();
			const controller = new AbortController();
			inFlightRef.current.add(controller);

			if (options.signal) {
				if (options.signal.aborted) {
					controller.abort();
				} else {
					options.signal.addEventListener("abort", () => controller.abort(), {
						once: true,
					});
				}
			}

			options.onBefore?.();
			setProcessing(true);
			setErrors({});
			setWasSuccessful(false);
			setStatus(null);

			const fullUrl = appendQuery(resolveUrl(url, config.baseUrl), options.params);
			const xsrf = readXsrfToken();
			const xsrfHeaderName = config.xsrfHeaderName ?? "X-XSRF-TOKEN";

			const headers: Record<string, string> = {
				Accept: "application/json",
				"X-Requested-With": "XMLHttpRequest",
				...(config.defaultHeaders ?? {}),
				...(xsrf ? { [xsrfHeaderName]: xsrf } : {}),
				...options.headers,
			};

			const body = options.data === undefined ? data : { ...data, ...(options.data as Partial<TForm>) };
			const hasBody = method !== "get" && body !== undefined && Object.keys(body).length > 0;
			if (hasBody && !hasHeader(headers, "content-type")) {
				headers["Content-Type"] = "application/json";
			}

			let res: Response;
			try {
				try {
					res = await fetch(fullUrl, {
						method: method.toUpperCase(),
						credentials: "include",
						headers,
						body: hasBody ? JSON.stringify(body) : undefined,
						signal: controller.signal,
					});
				} catch (networkErr) {
					if ((networkErr as Error).name === "AbortError") throw networkErr;
					if (options.errorToast !== false && config.onErrorToast) {
						config.onErrorToast(options.errorToast ?? "Network error. Please try again.");
					}
					throw networkErr;
				}

				const contentType = res.headers.get("content-type") ?? "";
				const json: unknown = contentType.includes("application/json") ? await res.json() : null;

				setStatus(res.status);
				config.onResponse?.(json, res.status, res.ok);

				if (!res.ok) {
					const flat = (config.parseErrors?.(json, res.status) ?? {}) as FieldErrors<TForm>;
					setErrors(flat);

					const message = config.parseMessage?.(json, res.status) ?? `Request failed (${res.status})`;

					if (options.errorToast !== false && config.onErrorToast) {
						config.onErrorToast(options.errorToast ?? message);
					}

					options.onError?.(flat, json, res.status);
					throw new ApiError(res.status, message, json);
				}

				const typedResponse = json as TResponse;
				setResponse(typedResponse);
				setWasSuccessful(true);

				if (options.intoProp) {
					if (typeof options.intoProp === "string") {
						router.replaceProp(options.intoProp, () => typedResponse as unknown);
					} else {
						const partial = options.intoProp(typedResponse);
						for (const [name, value] of Object.entries(partial)) {
							router.replaceProp(name, () => value);
						}
					}
				}

				if (options.reloadProps) {
					const only = Array.isArray(options.reloadProps) ? options.reloadProps : [options.reloadProps];
					router.reload({ ...(options.reloadOptions ?? {}), only });
				}

				if (options.successToast !== undefined && config.onSuccessToast) {
					config.onSuccessToast(options.successToast);
				}

				options.onSuccess?.(typedResponse);
				return typedResponse;
			} finally {
				inFlightRef.current.delete(controller);
				if (inFlightRef.current.size === 0) {
					setProcessing(false);
				}
				options.onFinish?.();
			}
		},
		[data],
	);

	const verb = (method: Method) => (url: string, options?: SubmitOptions<TResponse, TForm>) =>
		submit(method, url, options);

	return {
		data,
		setData,
		errors,
		hasErrors: Object.keys(errors).length > 0,
		processing,
		response,
		wasSuccessful,
		status,
		reset,
		clearErrors,
		cancel,
		submit,
		get: verb("get"),
		post: verb("post"),
		put: verb("put"),
		patch: verb("patch"),
		delete: verb("delete"),
	};
}

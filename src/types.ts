import type { ReloadOptions } from "@inertiajs/core";

export type Method = "get" | "post" | "put" | "patch" | "delete";

export type FieldErrors<TForm> = Partial<Record<keyof TForm | string, string>>;

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type IntoProp<TResponse> = string | ((response: TResponse) => Record<string, unknown>);

export interface SubmitOptions<TResponse, TForm> {
	/** Override the request body. If omitted, the hook's `data` is sent. */
	data?: Partial<TForm>;
	/** Query string params. `null`/`undefined` values are skipped. */
	params?: QueryParams;
	/** Extra headers merged on top of the defaults. */
	headers?: Record<string, string>;
	/** External abort signal. Aborting either this or `cancel()` cancels the request. */
	signal?: AbortSignal;

	/**
	 * After success, pipe the response into Inertia page props client-side via
	 * `router.replaceProp`. Pass a string to set `page.props[name] = response`,
	 * or a function to map the response into a partial props object.
	 */
	intoProp?: IntoProp<TResponse>;
	/**
	 * After success, trigger an Inertia partial reload for these prop names
	 * (`router.reload({ only: [...] })`). Server is source of truth.
	 */
	reloadProps?: string | string[];
	/** Extra options forwarded to `router.reload` (merged with `only`). */
	reloadOptions?: Omit<ReloadOptions, "only">;

	/** Value forwarded to the configured `onSuccessToast` handler. */
	successToast?: unknown;
	/**
	 * Value forwarded to the configured `onErrorToast` handler. Pass `false` to
	 * suppress the default error toast for this call.
	 */
	errorToast?: unknown | false;

	onBefore?: () => void;
	onSuccess?: (response: TResponse) => void;
	onError?: (errors: FieldErrors<TForm>, raw: unknown, status: number) => void;
	onFinish?: () => void;
}

export interface UseApi<TForm extends object, TResponse = unknown> {
	data: TForm;
	setData: <K extends keyof TForm>(field: K | Partial<TForm>, value?: TForm[K]) => void;
	errors: FieldErrors<TForm>;
	hasErrors: boolean;
	processing: boolean;
	response: TResponse | null;
	wasSuccessful: boolean;
	status: number | null;
	reset: () => void;
	clearErrors: () => void;
	cancel: () => void;
	submit: (method: Method, url: string, options?: SubmitOptions<TResponse, TForm>) => Promise<TResponse>;
	get: (url: string, options?: SubmitOptions<TResponse, TForm>) => Promise<TResponse>;
	post: (url: string, options?: SubmitOptions<TResponse, TForm>) => Promise<TResponse>;
	put: (url: string, options?: SubmitOptions<TResponse, TForm>) => Promise<TResponse>;
	patch: (url: string, options?: SubmitOptions<TResponse, TForm>) => Promise<TResponse>;
	delete: (url: string, options?: SubmitOptions<TResponse, TForm>) => Promise<TResponse>;
}

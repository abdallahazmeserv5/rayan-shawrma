import { ofetch, type FetchOptions, type FetchContext } from "ofetch";

/**
 * Client configuration options
 */
export interface ClientConfig extends Omit<FetchOptions, "method" | "body"> {
  baseURL?: string;
  tokenCookieName?: string;
  useFormData?: boolean;
  autoLocale?: boolean;
  headers?: HeadersInit;
}

/**
 * Request options for HTTP methods
 */
export interface RequestOptions
  extends Omit<FetchOptions, "method" | "body" | "responseType"> {
  query?: Record<string, string | number | boolean>;
  headers?: HeadersInit;
}

/**
 * Body type for requests
 */
type RequestBody = Record<string, unknown> | BodyInit | null | undefined;

/**
 * HTTP Client interface
 */
export interface HttpClient {
  get: <T = unknown>(url: string, options?: RequestOptions) => Promise<T>;
  post: <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ) => Promise<T>;
  put: <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ) => Promise<T>;
  patch: <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ) => Promise<T>;
  delete: <T = unknown>(url: string, options?: RequestOptions) => Promise<T>;
  raw: typeof ofetch;
}

function getLocaleFromCookies(): string {
  if (typeof window !== "undefined") {
    // Client-side: read from document.cookie
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="));
    return cookie ? cookie.split("=")[1] : "ar";
  } else {
    try {
      if (
        typeof globalThis !== "undefined" &&
        (globalThis as any).__NEXT_LOCALE__
      ) {
        return (globalThis as any).__NEXT_LOCALE__;
      }
    } catch {}

    return "ar";
  }
}

/**
 * Convert JSON object to FormData
 */
export const jsonToFormData = (
  json: unknown,
  formData: FormData = new FormData(),
  parentKey: string = ""
): FormData => {
  if (json === null || json === undefined) return formData;

  if (
    typeof json === "object" &&
    !(json instanceof File) &&
    !(json instanceof Blob)
  ) {
    if (Array.isArray(json)) {
      json.forEach((item, index) => {
        const key = parentKey ? `${parentKey}[${index}]` : `${index}`;
        jsonToFormData(item, formData, key);
      });
    } else {
      Object.entries(json).forEach(([key, value]) => {
        const formKey = parentKey ? `${parentKey}[${key}]` : key;
        jsonToFormData(value, formData, formKey);
      });
    }
  } else {
    formData.append(parentKey, json as string | Blob);
  }

  return formData;
};

/**
 * Create ofetch client with authentication, FormData, and automatic locale support
 *
 * For Server Components: Pass locale explicitly via headers
 * For Client Components: Locale is auto-detected from cookies
 *
 * @example Server Component
 * ```ts
 * const locale = await getLocale();
 * const client = createClient({ headers: { "Accept-Language": locale } });
 * ```
 *
 * @example Client Component
 * ```ts
 * const client = createClient(); // Auto-detects locale from cookies
 * ```
 */
export const createClient = (config: ClientConfig = {}): HttpClient => {
  const {
    baseURL = process.env.NEXT_PUBLIC_BACKEND_URL,
    tokenCookieName = "acess-token",
    useFormData = true,
    autoLocale = true, // Enable auto locale by default
    headers = {},
    ...restConfig
  } = config;

  // Create base client
  const client = ofetch.create({
    baseURL,
    ...restConfig,
    onRequest({ options }: FetchContext) {
      // Initialize headers if not exists
      if (!options.headers) {
        options.headers = new Headers();
      }

      // Convert headers to Headers object if needed
      const headerObj = new Headers(options.headers as HeadersInit);

      // Auto-add Accept-Language header if enabled and not already set
      if (autoLocale && !headerObj.has("Accept-Language")) {
        const locale = getLocaleFromCookies();
        headerObj.set("Accept-Language", locale);
      }

      // Merge custom headers (these will override auto-detected locale if provided)
      const customHeaders = new Headers(headers);
      customHeaders.forEach((value, key) => {
        headerObj.set(key, value);
      });

      // Convert to FormData if needed
      if (useFormData && options.body && typeof options.body === "object") {
        // Don't convert if it's already FormData
        if (!(options.body instanceof FormData)) {
          options.body = jsonToFormData(options.body) as RequestBody;

          // IMPORTANT: Remove Content-Type header to let the browser set it automatically
          // The browser will add the correct boundary for multipart/form-data
          headerObj.delete("Content-Type");
        }
      }

      options.headers = headerObj;
    },
    onResponseError({ response }) {
      console.error("API Error:", {
        status: response.status,
        data: response._data,
      });
    },
  });

  return {
    get: <T = unknown>(
      url: string,
      options: RequestOptions = {}
    ): Promise<T> => {
      return client<T>(url, { ...options, method: "GET" });
    },
    post: <T = unknown>(
      url: string,
      data?: unknown,
      options: RequestOptions = {}
    ): Promise<T> => {
      return client<T>(url, {
        ...options,
        method: "POST",
        body: data as RequestBody,
      });
    },
    put: <T = unknown>(
      url: string,
      data?: unknown,
      options: RequestOptions = {}
    ): Promise<T> => {
      return client<T>(url, {
        ...options,
        method: "PUT",
        body: data as RequestBody,
      });
    },
    patch: <T = unknown>(
      url: string,
      data?: unknown,
      options: RequestOptions = {}
    ): Promise<T> => {
      return client<T>(url, {
        ...options,
        method: "PATCH",
        body: data as RequestBody,
      });
    },
    delete: <T = unknown>(
      url: string,
      options: RequestOptions = {}
    ): Promise<T> => {
      return client<T>(url, { ...options, method: "DELETE" });
    },
    raw: client,
  };
};

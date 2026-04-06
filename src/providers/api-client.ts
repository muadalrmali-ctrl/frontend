import { API_URL, AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./constants";

export type BackendResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ApiClientOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  query?: Record<string, unknown>;
};

export class ApiError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const buildUrl = (path: string, query?: Record<string, unknown>) => {
  const baseUrl = trimTrailingSlash(API_URL || "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

export const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

export const apiClient = async <T>(
  path: string,
  options: ApiClientOptions = {}
): Promise<T> => {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (response.status === 401 || response.status === 403) {
    clearStoredAuth();
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? "Request failed",
      response.status,
      payload
    );
  }

  if (payload?.success === false) {
    throw new ApiError(payload.message ?? "Request failed", response.status, payload);
  }

  return payload?.data as T;
};

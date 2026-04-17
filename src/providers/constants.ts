const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL =
  configuredApiUrl && configuredApiUrl.length > 0 ? configuredApiUrl : "/api";
export const AUTH_TOKEN_KEY = "maintenance_center_token";
export const AUTH_USER_KEY = "maintenance_center_user";

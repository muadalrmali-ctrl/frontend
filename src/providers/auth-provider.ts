import type { AuthProvider } from "@refinedev/core";
import { apiClient, clearStoredAuth } from "./api-client";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./constants";
import { getDefaultRouteForRole } from "@/lib/access-control";

export type BackendUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string | null;
};

type LoginResponse = {
  user: BackendUser;
  token: string;
};

const authDebug = (event: string, payload?: unknown) => {
  if (!import.meta.env.DEV) return;
  console.info(`[auth] ${event}`, payload);
};

export const getStoredUser = (): BackendUser | null => {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as BackendUser;
  } catch {
    clearStoredAuth();
    return null;
  }
};

const isTokenExpired = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    if (!payload.exp) return false;

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const toIdentity = (user: BackendUser) => {
  const nameParts = user.name.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? user.name;
  const lastName = nameParts.slice(1).join(" ");

  return {
    ...user,
    firstName,
    lastName,
    fullName: user.name,
  };
};

export const authProvider: AuthProvider = {
  async login(params) {
    try {
      authDebug("login:start", { email: params.email, to: params.to });
      const result = await apiClient<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: {
          email: params.email,
          password: params.password,
        },
      });

      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));

      authDebug("login:success", {
        user: result.user,
        tokenStored: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
        userStored: Boolean(getStoredUser()),
      });

      return {
        success: true,
        redirectTo: params.to ?? getDefaultRouteForRole(result.user.role),
      };
    } catch (error) {
      authDebug("login:error", error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Login failed"),
      };
    }
  },

  async logout() {
    authDebug("logout");
    clearStoredAuth();

    return {
      success: true,
      redirectTo: "/login",
    };
  },

  async check() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const user = getStoredUser();

    if (!token || !user || isTokenExpired(token)) {
      authDebug("check:unauthenticated", {
        hasToken: Boolean(token),
        hasUser: Boolean(user),
        tokenExpired: token ? isTokenExpired(token) : null,
      });
      clearStoredAuth();

      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      };
    }

    authDebug("check:authenticated", {
      user,
    });

    return {
      authenticated: true,
    };
  },

  async getIdentity() {
    const user = getStoredUser();
    return user ? toIdentity(user) : null;
  },

  async getPermissions() {
    return getStoredUser()?.role ?? null;
  },

  async onError(error) {
    if (error?.statusCode === 401) {
      authDebug("onError:logout-on-401", error);
      clearStoredAuth();

      return {
        logout: true,
        redirectTo: "/login",
      };
    }

    if (error?.statusCode === 403) {
      authDebug("onError:ignore-403", error);
      return {};
    }

    authDebug("onError:pass-through", error);

    return {};
  },
};

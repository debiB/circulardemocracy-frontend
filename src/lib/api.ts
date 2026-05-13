import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const { requireAuth = true, headers = {}, ...fetchOptions } = options;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers as Record<string, string>),
    };

    if (requireAuth) {
      const {
        data: { session },
      } = await supabase!.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated. Please log in and try again.");
      }

      requestHeaders.Authorization = `Bearer ${session.access_token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    return response;
  }

  async get(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    return this.fetch(endpoint, { ...options, method: "GET" });
  }

  async post(
    endpoint: string,
    body?: any,
    options: FetchOptions = {},
  ): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch(
    endpoint: string,
    body?: any,
    options: FetchOptions = {},
  ): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(
    endpoint: string,
    options: FetchOptions = {},
  ): Promise<Response> {
    return this.fetch(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);

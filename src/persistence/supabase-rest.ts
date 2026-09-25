import { readServerEnvironment } from "../config/server-environment.ts";
import { IntegrationError } from "../integrations/integration-error.ts";

interface SupabaseRequestOptions {
  readonly body?: unknown;
  readonly method?: "DELETE" | "GET" | "PATCH" | "POST";
  readonly prefer?: string;
  readonly query?: string;
}

export class SupabaseRestClient {
  readonly #secretKey: string;
  readonly #url: string;

  constructor(options: { readonly secretKey: string; readonly url: string }) {
    this.#secretKey = options.secretKey;
    this.#url = options.url.replace(/\/$/, "");
  }

  async request<T>(table: string, options: SupabaseRequestOptions = {}): Promise<T> {
    const response = await fetch(
      `${this.#url}/rest/v1/${table}${options.query ? `?${options.query}` : ""}`,
      {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          apikey: this.#secretKey,
          ...(this.#secretKey.startsWith("eyJ")
            ? { Authorization: `Bearer ${this.#secretKey}` }
            : {}),
          "Content-Type": "application/json",
          ...(options.prefer ? { Prefer: options.prefer } : {}),
        },
        method: options.method ?? "GET",
      },
    );

    if (!response.ok) {
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        `Supabase request failed with HTTP ${response.status}.`,
        { retryable: response.status >= 500, status: 503 },
      );
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

export function getSupabaseRestClient(): SupabaseRestClient {
  const environment = readServerEnvironment();
  if (!environment.supabase.url || !environment.supabase.secretKey) {
    throw new IntegrationError(
      "CONFIG_REQUIRED",
      "Operator accounts require SUPABASE_URL and SUPABASE_SECRET_KEY.",
      { retryable: false, status: 503 },
    );
  }

  return new SupabaseRestClient({
    secretKey: environment.supabase.secretKey,
    url: environment.supabase.url,
  });
}

export function postgrestEquals(value: string): string {
  return `eq.${encodeURIComponent(value)}`;
}

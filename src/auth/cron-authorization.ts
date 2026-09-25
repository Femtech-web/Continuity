import { timingSafeEqual } from "node:crypto";
import { IntegrationError } from "@/integrations/integration-error";

export function requireCronAuthorization(request: Request): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new IntegrationError(
      "CONFIG_REQUIRED",
      "Scheduled monitoring requires CRON_SECRET.",
      { retryable: false, status: 503 },
    );
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new IntegrationError("AUTH_REQUIRED", "Scheduled monitor authorization failed.", {
      retryable: false,
      status: 401,
    });
  }
  const expected = Buffer.from(secret);
  const candidate = Buffer.from(authorization.slice(7));
  if (
    expected.length !== candidate.length ||
    !timingSafeEqual(expected, candidate)
  ) {
    throw new IntegrationError("AUTH_REQUIRED", "Scheduled monitor authorization failed.", {
      retryable: false,
      status: 401,
    });
  }
}

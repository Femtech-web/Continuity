import { z } from "zod";
import { SPCXX_MINT } from "@/integrations/meteora-dbc";

export const protectedMarketDraftSchema = z.object({
  operatorAgentId: z.number().int().positive(),
  quoteMint: z.literal(SPCXX_MINT),
  quoteSymbol: z.literal("SPCXx"),
  tokenDescription: z.string().trim().min(20).max(500),
  tokenImageUrl: z.string().url().optional().nullable(),
  tokenName: z.string().trim().min(2).max(48),
  tokenSymbol: z.string().trim().regex(/^[A-Z0-9]{2,10}$/),
});

export type ProtectedMarketDraftInput = z.infer<typeof protectedMarketDraftSchema>;

export interface ProtectedMarketDraft {
  readonly config: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly id: string;
  readonly operatorAgentId: number;
  readonly quoteMint: string;
  readonly quoteSymbol: string;
  readonly referenceKey: string | null;
  readonly status:
    | "APPROVED"
    | "CONFIRMED"
    | "DRAFT"
    | "PREFLIGHT_FAILED"
    | "PREFLIGHT_READY"
    | "SUBMITTED";
  readonly tokenDescription: string;
  readonly tokenImageUrl: string | null;
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly updatedAt: string;
}

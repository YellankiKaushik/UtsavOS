// Compatibility entry point for direct Gemini callers and existing adapter tests.
import {
  generatePlan as plan,
  generateStructured as structured,
  explainImpact as explain,
} from "./ai/service";
import type { ModelTransport } from "./ai/types";
import type { EventRecord } from "@/domain/contracts";
import type { z } from "zod";
export type { ModelTransport, ModelResponse } from "./ai/types";
export { SYSTEM_PROMPT } from "./ai/service";
const options = (transport?: ModelTransport) => ({
  provider: "gemini" as const,
  noFallback: true,
  ...(transport ? { transports: { gemini: transport } } : {}),
});
export function generatePlan(
  event: EventRecord,
  preferences: string,
  transport?: ModelTransport,
) {
  return plan(event, preferences, options(transport));
}
export function generateStructured<T>(
  schema: z.ZodType<T>,
  context: unknown,
  transport?: ModelTransport,
) {
  return structured(schema, context, options(transport));
}
export function explainImpact(context: unknown, transport?: ModelTransport) {
  return explain(context, options(transport));
}

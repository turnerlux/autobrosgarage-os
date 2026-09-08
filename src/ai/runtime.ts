import { getServerEnvironment } from "@/lib/env/server";

import { ClaudeModelProvider } from "./providers/anthropic";
import { UnconfiguredAiModelProvider, type AiModelProvider } from "./provider";

/**
 * Selects the AI provider from configuration, mirroring `src/auth/runtime.ts`. With no
 * `ANTHROPIC_API_KEY` set this returns the fail-closed stub, so an unconfigured install still
 * refuses loudly instead of silently degrading -- the rule ADR 0006 set for this boundary.
 *
 * The provider is built per call rather than cached, so rotating a key takes a restart rather
 * than a code change, and a test never inherits another test's client.
 */
export function getAiModelProvider(): AiModelProvider {
  const { ANTHROPIC_API_KEY, AI_MODEL } = getServerEnvironment();
  if (!ANTHROPIC_API_KEY) return new UnconfiguredAiModelProvider();

  return new ClaudeModelProvider({ apiKey: ANTHROPIC_API_KEY, model: AI_MODEL });
}

/** True when a real model provider is configured -- for showing AI features as on or off. */
export function isAiConfigured(): boolean {
  return Boolean(getServerEnvironment().ANTHROPIC_API_KEY);
}

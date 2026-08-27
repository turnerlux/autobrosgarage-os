import { describe, expect, it } from "vitest";

import {
  AiModelProviderNotConfiguredError,
  UnconfiguredAiModelProvider,
  type AiModelProvider,
} from "./provider";

describe("UnconfiguredAiModelProvider", () => {
  it("fails closed instead of returning a default or simulated completion", async () => {
    const provider: AiModelProvider = new UnconfiguredAiModelProvider();

    await expect(
      provider.complete({ systemPrompt: "you are a shop assistant", messages: [], tools: [] }),
    ).rejects.toThrow(AiModelProviderNotConfiguredError);
  });
});

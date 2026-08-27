import { describe, expect, it } from "vitest";

import { Logger, type LogEntry, type LogSink } from "./logger";

class MemorySink implements LogSink {
  entries: LogEntry[] = [];
  write(entry: LogEntry): void {
    this.entries.push(entry);
  }
}

describe("Logger", () => {
  it("writes structured tenant and request context", () => {
    const sink = new MemorySink();
    const logger = new Logger("info", {}, sink).child({ shopId: "shop-1", requestId: "req-1" });

    logger.info("job.created", { jobId: "job-1" });

    expect(sink.entries[0]).toMatchObject({
      level: "info",
      message: "job.created",
      shopId: "shop-1",
      requestId: "req-1",
      jobId: "job-1",
    });
  });

  it("redacts credentials recursively", () => {
    const sink = new MemorySink();
    const logger = new Logger("debug", {}, sink);

    logger.info("request", {
      authorization: "Bearer private",
      nested: { apiKey: "private", safe: "visible" },
    });

    expect(sink.entries[0]).toMatchObject({
      authorization: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", safe: "visible" },
    });
  });

  it("respects the minimum level", () => {
    const sink = new MemorySink();
    const logger = new Logger("warn", {}, sink);
    logger.info("hidden");
    logger.warn("visible");
    expect(sink.entries.map((entry) => entry.message)).toEqual(["visible"]);
  });
});

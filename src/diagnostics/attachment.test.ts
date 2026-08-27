import { describe, expect, it } from "vitest";

import { attachDiagnosticMedia } from "./attachment";

const shopId = "1e8f8732-e5bc-47db-b811-ffd67944dc92";
const sessionId = "3f9f8732-e5bc-47db-b811-ffd67944dc94";

describe("diagnostic attachments", () => {
  it("links a stored object without holding the file bytes itself", () => {
    const attachment = attachDiagnosticMedia(
      {
        shopId,
        diagnosticSessionId: sessionId,
        kind: "photo",
        originalFileName: "dashboard-warning.jpg",
      },
      {
        key: `shops/${shopId}/diagnostic/abc123.jpg`,
        contentType: "image/jpeg",
        byteLength: 204_800,
      },
    );

    expect(attachment.objectKey).toBe(`shops/${shopId}/diagnostic/abc123.jpg`);
    expect(attachment.contentType).toBe("image/jpeg");
    expect(attachment).not.toHaveProperty("bytes");
  });

  it("rejects an unrecognized attachment kind", () => {
    expect(() =>
      attachDiagnosticMedia(
        {
          shopId,
          diagnosticSessionId: sessionId,
          // @ts-expect-error -- intentionally invalid kind
          kind: "video",
          originalFileName: "clip.mp4",
        },
        { key: "shops/x/diagnostic/y.mp4", contentType: "video/mp4", byteLength: 1 },
      ),
    ).toThrow();
  });
});

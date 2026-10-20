import { BadRequestException } from "@nestjs/common";
import { assertValidUploadDataUrl } from "./upload-file.validation";

/** Payload mínimo válido (~1 byte) en base64. */
const TINY_B64 = "AA==";

function dataUrl(mime: string, base64 = TINY_B64): string {
  return `data:${mime};base64,${base64}`;
}

describe("assertValidUploadDataUrl", () => {
  it("accepts PDF", () => {
    expect(() =>
      assertValidUploadDataUrl("doc.pdf", "application/pdf", dataUrl("application/pdf")),
    ).not.toThrow();
  });

  it("accepts JPG", () => {
    expect(() =>
      assertValidUploadDataUrl("foto.jpg", "image/jpeg", dataUrl("image/jpeg")),
    ).not.toThrow();
  });

  it("rejects text/html", () => {
    expect(() =>
      assertValidUploadDataUrl("x.html", "text/html", dataUrl("text/html")),
    ).toThrow(BadRequestException);
  });

  it("rejects image/svg+xml", () => {
    expect(() =>
      assertValidUploadDataUrl("x.svg", "image/svg+xml", dataUrl("image/svg+xml")),
    ).toThrow(BadRequestException);
  });

  it("rejects when header mime and declared mime differ", () => {
    expect(() =>
      assertValidUploadDataUrl("x.jpg", "image/jpeg", dataUrl("image/png")),
    ).toThrow(BadRequestException);
  });

  it("rejects when only declared mime is allowed", () => {
    expect(() =>
      assertValidUploadDataUrl("x.jpg", "image/jpeg", dataUrl("text/html")),
    ).toThrow(BadRequestException);
  });
});

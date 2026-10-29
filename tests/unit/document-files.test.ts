import { it, expect } from "vitest";
import {
  extractDocumentText,
  validateDocumentBytes,
} from "@/infrastructure/documents/files";
import { pdf } from "../helpers/pdf";
it("extracts actual PDF text in a bounded separate process", async () => {
  const result = await extractDocumentText(
    pdf("SYNTHETIC QUOTATION INR 1000.00"),
    "application/pdf",
  );
  expect(result).toHaveLength(1);
  expect(result[0].page).toBe(1);
  expect(result[0].text).toContain("SYNTHETIC QUOTATION INR 1000.00");
});
it("rejects size, file-type mismatches, active PDF markers and unsupported automatic OCR", async () => {
  expect(() =>
    validateDocumentBytes(Buffer.alloc(2097153), "application/pdf"),
  ).toThrow("2 MB");
  expect(() =>
    validateDocumentBytes(
      Buffer.from("<script>bad</script>"),
      "application/pdf",
    ),
  ).toThrow("declared type");
  expect(() =>
    validateDocumentBytes(pdf("/JavaScript"), "application/pdf"),
  ).toThrow("active content");
  expect(() =>
    validateDocumentBytes(new Uint8Array([255, 255]), "text/plain"),
  ).toThrow("UTF-8");
  await expect(
    extractDocumentText(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
    ),
  ).rejects.toThrow("manually reviewed transcript");
});

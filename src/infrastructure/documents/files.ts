import "server-only";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { DomainError } from "@/domain/errors";
import {
  documentPages,
  MAX_DOCUMENT_BYTES,
  type DocumentPage,
} from "@/domain/documents";
export function validateDocumentBytes(bytes: Uint8Array, type: string) {
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES)
    throw new DomainError(
      "DOCUMENT_TOO_LARGE",
      "Files must be between 1 byte and 2 MB.",
      413,
    );
  const buffer = Buffer.from(bytes),
    start = buffer.subarray(0, 8);
  const valid =
    type === "application/pdf"
      ? start.subarray(0, 5).toString("ascii") === "%PDF-"
      : type === "image/png"
        ? start.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : type === "image/jpeg"
          ? start[0] === 255 && start[1] === 216 && start[2] === 255
          : type === "text/plain";
  if (!valid)
    throw new DomainError(
      "DOCUMENT_TYPE_MISMATCH",
      "The file contents do not match its declared type.",
      422,
    );
  if (
    type === "application/pdf" &&
    /\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction)\b/i.test(
      buffer.toString("latin1"),
    )
  )
    throw new DomainError(
      "DOCUMENT_ACTIVE_CONTENT",
      "This PDF contains unsupported active content. Upload a plain quotation export.",
      422,
    );
  if (type === "text/plain") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\0")) throw Error();
    } catch {
      throw new DomainError(
        "DOCUMENT_TYPE_MISMATCH",
        "Upload a UTF-8 plain-text file.",
        422,
      );
    }
  }
  return bytes;
}
export async function extractDocumentText(
  bytes: Uint8Array,
  type: string,
): Promise<DocumentPage[]> {
  validateDocumentBytes(bytes, type);
  if (type === "text/plain")
    return documentPages.parse([
      {
        page: 1,
        text: new TextDecoder()
          .decode(bytes)
          .replaceAll("\r\n", "\n")
          .normalize("NFC"),
      },
    ]);
  if (type !== "application/pdf")
    throw new DomainError(
      "MANUAL_TRANSCRIPT_REQUIRED",
      "This image needs a manually reviewed transcript. Automatic OCR is unavailable.",
      422,
    );
  const output = await new Promise<string>((accept, reject) => {
    const child = execFile(
      process.execPath,
      [
        "--max-old-space-size=128",
        resolve(process.cwd(), "scripts/pdf-extract-worker.mjs"),
      ],
      {
        env: { NODE_ENV: "production" },
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error)
          return reject(
            new DomainError(
              "DOCUMENT_PARSE_FAILED",
              "The PDF could not be parsed within the size, page or time limit. Use a plain-text transcript.",
              422,
            ),
          );
        accept(stdout);
      },
    );
    child.stdin?.on("error", () => {});
    child.stdin?.end(bytes);
  });
  try {
    return documentPages.parse(JSON.parse(output));
  } catch {
    throw new DomainError(
      "DOCUMENT_PARSE_FAILED",
      "The PDF did not yield supported text. Use a reviewed transcript.",
      422,
    );
  }
}
export async function readDocumentBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_DOCUMENT_BYTES)
    throw new DomainError(
      "DOCUMENT_TOO_LARGE",
      "Files are limited to 2 MB.",
      413,
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new DomainError("INVALID_INPUT", "File bytes are required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      throw new DomainError(
        "DOCUMENT_TOO_LARGE",
        "Files are limited to 2 MB.",
        413,
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, size);
}

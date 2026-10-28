import { getDocumentProxy } from "unpdf";
// No application environment or credentials are inherited by this bounded parser process.
const chunks = [];
let size = 0;
for await (const chunk of process.stdin) {
  size += chunk.length;
  if (size > 2097152) process.exit(2);
  chunks.push(chunk);
}
let pdf;
try {
  pdf = await getDocumentProxy(new Uint8Array(Buffer.concat(chunks)), {
    isEvalSupported: false,
    maxImageSize: 16777216,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  if (pdf.numPages < 1 || pdf.numPages > 30) process.exit(2);
  const pages = [];
  let length = 0;
  for (let index = 1; index <= pdf.numPages; index++) {
    const page = await pdf.getPage(index),
      content = await page.getTextContent();
    const text = content.items
      .filter((item) => typeof item.str === "string")
      .map((item) => item.str + (item.hasEOL ? "\n" : " "))
      .join("")
      .trim()
      .normalize("NFC");
    length += text.length;
    if (length > 50000) process.exit(2);
    pages.push({ page: index, text });
    await page.cleanup();
  }
  if (!pages.some((page) => page.text.trim())) process.exit(2);
  await pdf.loadingTask.destroy();
  process.stdout.write(JSON.stringify(pages));
} catch (error) {
  process.stderr.write(
    error instanceof Error ? error.name : "PDF_PARSE_FAILED",
  );
  process.exitCode = 2;
  try {
    await pdf?.loadingTask?.destroy();
  } catch {
    /* Parser already failed. */
  }
}

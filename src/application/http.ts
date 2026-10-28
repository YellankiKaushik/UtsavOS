import { NextResponse } from "next/server";
import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { applicationOrigin } from "./origin";
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = applicationOrigin(request);
  if (!origin || origin !== target)
    throw new DomainError(
      "INVALID_ORIGIN",
      "Request origin is not allowed",
      403,
    );
}
export async function readBody(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 100000)
    throw new DomainError("INVALID_INPUT", "Request exceeds 100 KB", 413);
  const reader = request.body?.getReader();
  if (!reader)
    throw new DomainError("INVALID_INPUT", "JSON body required", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 100000) {
      await reader.cancel();
      throw new DomainError("INVALID_INPUT", "Request exceeds 100 KB", 413);
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(all)) as unknown;
  } catch {
    throw new DomainError("INVALID_INPUT", "Valid JSON required", 400);
  }
}
export function key(request: Request) {
  const parsed = z.uuid().safeParse(request.headers.get("Idempotency-Key"));
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "A UUID Idempotency-Key is required",
      400,
    );
  return parsed.data;
}
export async function handle(
  work: (requestId: string) => Promise<unknown>,
  status = 200,
) {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  try {
    const data = await work(requestId);
    if (data instanceof Response) {
      data.headers.set("Cache-Control", "private, no-store");
      data.headers.set("X-Request-Id", requestId);
      return data;
    }
    console.info(
      JSON.stringify({
        component: "api",
        requestId,
        status,
        code: "OK",
        latencyMs: Math.round(performance.now() - started),
      }),
    );
    return NextResponse.json(
      { data, meta: { requestId } },
      {
        status,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Request-ID": requestId,
        },
      },
    );
  } catch (error) {
    const e =
      error instanceof z.ZodError
        ? new DomainError("INVALID_INPUT", "Check the supplied fields", 400)
        : error instanceof DomainError
          ? error
          : new DomainError(
              "INTERNAL_ERROR",
              "An unexpected error occurred",
              500,
            );
    console.error(
      JSON.stringify({
        component: "api",
        requestId,
        code: e.code,
        status: e.status,
        latencyMs: Math.round(performance.now() - started),
      }),
    );
    return NextResponse.json(
      {
        error: {
          code: e.code,
          message: e.message,
          requestId,
          retryable: "retryable" in e ? !!e.retryable : e.status >= 500,
          details:
            error instanceof z.ZodError
              ? error.issues.map((i) => ({ path: i.path, message: i.message }))
              : [],
        },
      },
      {
        status: e.status,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Request-ID": requestId,
        },
      },
    );
  }
}

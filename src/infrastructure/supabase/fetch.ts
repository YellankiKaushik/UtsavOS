import "server-only";
export const supabaseFetch: typeof fetch = (input, init) => {
  const caller =
    init?.signal ?? (input instanceof Request ? input.signal : null);
  const timeout = AbortSignal.timeout(10000);
  return fetch(input, {
    ...init,
    signal: caller ? AbortSignal.any([caller, timeout]) : timeout,
  });
};

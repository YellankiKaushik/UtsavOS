export class DomainError extends Error {
  constructor(
    public code: string,
    message = code,
    public status = 422,
  ) {
    super(message);
  }
}
export function invariant(
  condition: unknown,
  code: string,
  message?: string,
): asserts condition {
  if (!condition) throw new DomainError(code, message);
}

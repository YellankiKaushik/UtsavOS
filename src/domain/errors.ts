export class DomainError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message = code, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function invariant(
  condition: unknown,
  code: string,
  message?: string,
): asserts condition {
  if (!condition) throw new DomainError(code, message);
}

export class ProtocolError extends Error {
  constructor(
    message: string,
  ) {
    super(message);
  }
}

export function noop() {}

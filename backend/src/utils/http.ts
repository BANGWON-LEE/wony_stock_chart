import type { FastifyReply } from "fastify";

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SYMBOL_NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "BROKER_API_ERROR"
  | "BROKER_UNAVAILABLE";

export type ApiErrorPayload = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function fail(error: ApiErrorPayload): {
  success: false;
  error: ApiErrorPayload;
} {
  return { success: false, error };
}

export function sendNoContent(reply: FastifyReply): void {
  reply.status(204).send();
}

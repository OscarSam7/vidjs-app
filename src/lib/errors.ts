import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado o sesión expirada") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso no autorizado para este recurso") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicto con el estado actual del recurso") {
    super(message, 409, "CONFLICT");
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Solicitud inválida") {
    super(message, 400, "BAD_REQUEST");
  }
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const issues = error.errors.map((e) => `${e.path.join(".") || "campo"}: ${e.message}`).join(", ");
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `Error de validación: ${issues}`,
          details: error.errors,
        },
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error inesperado en el servidor",
      },
    },
    { status: 500 }
  );
}

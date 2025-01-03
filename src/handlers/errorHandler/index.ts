import payload from "payload";
import { Response } from "express";

export const handleError = (
  error: unknown,
  res: Response,
  operation: string,
) => {
  payload.logger.error(
    error,
    `Error ${operation}: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  res.status(500).json({
    error: `Failed to ${operation}`,
    message: error instanceof Error ? error.message : "Unknown error occurred",
  });
};

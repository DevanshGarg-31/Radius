import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { z } from "zod";
import { config } from "../config.js";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, details);
export const unauthorized = (message = "Sign in to continue") => new HttpError(401, message);
export const forbidden = (message = "You are not allowed to do this") => new HttpError(403, message);
export const notFound = (what: string) => new HttpError(404, `${what} not found`);
export const conflict = (message: string) => new HttpError(409, message);

export const corsHeaders = {
  "Access-Control-Allow-Origin": config.corsOrigin,
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
};

export function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify(body),
  };
}

export function redirect(location: string): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 302, headers: { Location: location, ...corsHeaders } };
}

export function errorResponse(err: unknown): APIGatewayProxyStructuredResultV2 {
  if (err instanceof HttpError) {
    return json(err.statusCode, { error: err.message, details: err.details });
  }
  if (err instanceof z.ZodError) {
    return json(400, { error: "Invalid request", details: z.flattenError(err) });
  }
  return json(500, { error: "Internal server error" });
}

/** Parses and validates a JSON body against a zod schema. */
export function parseBody<T extends z.ZodType>(event: APIGatewayProxyEventV2, schema: T): z.infer<T> {
  let raw: unknown = {};
  if (event.body) {
    const text = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    try {
      raw = JSON.parse(text);
    } catch {
      throw badRequest("Body must be valid JSON");
    }
  }
  return schema.parse(raw);
}

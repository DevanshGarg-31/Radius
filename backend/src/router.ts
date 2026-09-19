import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { callerId, notFound } from "./utils/http.js";

export interface Req {
  event: APIGatewayProxyEventV2;
  params: Record<string, string>;
  query: Record<string, string>;
  callerId?: string;
}

export type Handler = (req: Req) => Promise<APIGatewayProxyStructuredResultV2>;

interface Route {
  method: string;
  pattern: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
}

/**
 * Tiny path router. API Gateway sends every request to one Lambda (route "ANY /{proxy+}"),
 * so routes live here in code instead of in the console.
 * Patterns: "/projects/:projectId/team"; a trailing "/*" captures the rest as params.rest.
 */
export class Router {
  private readonly routes: Route[] = [];

  on(method: string, pattern: string, handler: Handler): this {
    const keys: string[] = [];
    const source = pattern
      .split("/")
      .map((part) => {
        if (part === "*") {
          keys.push("rest");
          return "(.+)";
        }
        if (part.startsWith(":")) {
          keys.push(part.slice(1));
          return "([^/]+)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    this.routes.push({ method, pattern, regex: new RegExp(`^${source}/?$`), keys, handler });
    return this;
  }

  get = (pattern: string, handler: Handler) => this.on("GET", pattern, handler);
  post = (pattern: string, handler: Handler) => this.on("POST", pattern, handler);
  put = (pattern: string, handler: Handler) => this.on("PUT", pattern, handler);

  /** Finds the route for a request; returns the pattern too so it can be logged. */
  resolve(event: APIGatewayProxyEventV2): { route: string; run: () => Promise<APIGatewayProxyStructuredResultV2> } {
    const method = event.requestContext.http.method.toUpperCase();
    const path = stripStage(event);
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.regex.exec(path);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1] ?? "")]));
      const query = Object.fromEntries(Object.entries(event.queryStringParameters ?? {}).map(([k, v]) => [k, v ?? ""]));
      const req: Req = { event, params, query, callerId: callerId(event) };
      return { route: `${method} ${r.pattern}`, run: () => r.handler(req) };
    }
    return {
      route: `${method} (unmatched)`,
      run: async () => {
        throw notFound(`Route ${method} ${path}`);
      },
    };
  }
}

/** HTTP APIs with a named stage (e.g. "prod") include it in rawPath. */
function stripStage(event: APIGatewayProxyEventV2): string {
  const stage = event.requestContext.stage;
  const path = event.rawPath || "/";
  if (stage && stage !== "$default" && path.startsWith(`/${stage}/`)) return path.slice(stage.length + 1);
  return path;
}

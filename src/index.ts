type OriginType =
  | string
  | boolean
  | RegExp
  | ((request: Request) => boolean)
  | Array<string | RegExp | ((request: Request) => boolean)>;

interface CorsConfig {
  /**
   * @default `true`
   *
   * Controls the **Access-Control-Allow-Origin** header.
   *
   * Accepts:
   * - `string`: Exact origin string
   * - `boolean`: `true` for `*` (all origins), `false` to disable
   * - `RegExp`: Pattern to match against request origin
   * - `Function`: Custom validation function
   * - `Array`: Multiple validation rules (first truthy match wins)
   */
  origins?: OriginType;
  
  /** 
   * HTTP methods allowed
   * @default "*"
   */
  methods?: string | string[] | "*";
  
  /** 
   * Headers allowed in requests
   * @default "*"
   */
  allowedHeaders?: string | string[] | "*";
  
  /** 
   * Headers exposed to browsers
   * @default "*"
   */
  exposeHeaders?: string | string[] | "*";
  
  /** 
   * Allow credentials (cookies, auth headers)
   * @default true
   */
  credentials?: boolean;
  
  /** 
   * Preflight cache duration in seconds
   * @default 5
   */
  maxAge?: number;
  
  /** 
   * Enable preflight OPTIONS handling
   * @default true
   */
  preflight?: boolean;
}

/**
 * CORS Middleware for Fetch API
 * 
 * A lightweight, type-safe middleware for handling Cross-Origin Resource Sharing
 * with native Fetch API Request and Response objects.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const cors = createCors();
 * const response = await cors(request, originalResponse);
 * 
 * // With custom configuration
 * const cors = createCors({
 *  origins: ["http://localhost:5173"],
 *  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
 *  allowedHeaders: ["Content-Type", "Authorization"],
 *  exposeHeaders: ["Content-Type", "Authorization"],
 *  credentials: true,
 *  maxAge: 86400,
 *  preflight: true,
 * });
 * ```
 */
function createCors(config?: CorsConfig) {
  const helper = new CorsHelper(config);
  
  return async function cors(
    request: Request,
    response: Response | Promise<Response>
  ): Promise<Response> {
    return helper.process(request, response);
  };
}

/**
 * CORS Helper Class
 * 
 * Core implementation of CORS logic with support for complex origin validation,
 * preflight requests, and dynamic header configuration.
 * 
 * @internal
 */
class CorsHelper {
  private config: Required<CorsConfig>;

  constructor(config: CorsConfig = {}) {
    this.config = {
      origins: config.origins ?? true,
      methods: config.methods ?? "*",
      allowedHeaders: config.allowedHeaders ?? "*",
      exposeHeaders: config.exposeHeaders ?? "*",
      credentials: config.credentials ?? true,
      maxAge: config.maxAge ?? 5,
      preflight: config.preflight ?? true,
    };
  }

  /**
   * Validates if a request origin is allowed
   */
  private isOriginAllowed(requestOrigin: string | null): boolean {
    if (!requestOrigin) return false;

    const originConfig = this.config.origins;

    const checkSingle = (
      item: string | boolean | RegExp | ((req: Request) => boolean)
    ) => {
      if (typeof item === "string") return item === requestOrigin;
      if (item === true) return true;
      if (item instanceof RegExp) return item.test(requestOrigin);
      if (typeof item === "function")
        return item({
          headers: new Headers({ origin: requestOrigin }),
        } as Request);
      return false;
    };

    if (Array.isArray(originConfig)) {
      return originConfig.some(checkSingle);
    }
    return checkSingle(originConfig);
  }

  /**
   * Converts config values to header strings
   */
  private toHeaderString(value: string | string[] | "*"): string {
    if (value === "*") return "*";
    if (Array.isArray(value)) return value.join(", ");
    return value;
  }

  /**
   * Handles CORS preflight (OPTIONS) requests
   */
  private handlePreflight(request: Request): Response | null {
    if (!this.config.preflight || request.method !== "OPTIONS") return null;

    const requestOrigin = request.headers.get("origin");
    if (!requestOrigin) return null;

    const allowed = this.isOriginAllowed(requestOrigin);
    if (!allowed) return null;

    const headers = new Headers({
      "Access-Control-Allow-Origin": this.config.origins === "*" ? "*" : requestOrigin,
      "Access-Control-Allow-Methods": this.toHeaderString(this.config.methods),
      "Access-Control-Allow-Headers": this.toHeaderString(this.config.allowedHeaders),
      "Access-Control-Max-Age": String(this.config.maxAge),
      Vary: "Origin",
    });

    if (this.config.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }

    return new Response(null, { status: 204, headers });
  }

  /**
   * Processes CORS headers for regular requests
   */
  public async process(
    request: Request,
    response: Response | Promise<Response>
  ): Promise<Response> {
    // Handle async response
    const resolvedResponse = response instanceof Promise ? 
      await response : response;

    // Check for preflight
    const preflightResponse = this.handlePreflight(request);
    if (preflightResponse) return preflightResponse;

    // Apply CORS headers to regular response
    const requestOrigin = request.headers.get("origin");
    const allowed = this.isOriginAllowed(requestOrigin);

    if (allowed && requestOrigin) {
      const headers = new Headers(resolvedResponse.headers);
      
      headers.set(
        "Access-Control-Allow-Origin",
        this.config.origins === "*" ? "*" : requestOrigin
      );
      
      headers.set(
        "Access-Control-Allow-Methods",
        this.toHeaderString(this.config.methods)
      );
      
      headers.set(
        "Access-Control-Allow-Headers",
        this.toHeaderString(this.config.allowedHeaders)
      );
      
      headers.set(
        "Access-Control-Expose-Headers",
        this.toHeaderString(this.config.exposeHeaders)
      );

      if (this.config.credentials) {
        headers.set("Access-Control-Allow-Credentials", "true");
      }

      if (this.config.origins !== "*" && !Array.isArray(this.config.origins)) {
        headers.set("Vary", "Origin");
      }

      return new Response(resolvedResponse.body, {
        status: resolvedResponse.status,
        statusText: resolvedResponse.statusText,
        headers,
      });
    }

    return resolvedResponse;
  }
}

// Default export for convenience
export default createCors;
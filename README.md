# Cors helper

A tiny TypeScript library to help you set up [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) (Cross-Origin Resource Sharing) middleware for `Request` and `Response` objects compatible with the Fetch API (Edge Functions, Bun, Deno, Workers, etc).

## Getting Started

1. Install lib

   ```bash
   npm install cors-helpers
   ```

2. Using dependencie:

   ```javascript
   const cors = createCors();
   Bun.serve({
     fetch(req) {
       return cors(req, new Response("Hello Bun"));
     },
   });
   ```

3. Custom config.

   ```javascript
   const cors = createCors({
     origins: ["http://localhost:5173"],
     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allowedHeaders: ["Content-Type", "Authorization"],
     exposeHeaders: ["Content-Type", "Authorization"],
     credentials: true,
     maxAge: 86400,
     preflight: true,
   });
   Bun.serve({
     fetch(req) {
       return cors(req, new Response("Hello Bun"));
     },
   });
   ```
## License

Code in this template is public domain via [Unlicense](./LICENSE). Feel free to remove or replace for your own project.
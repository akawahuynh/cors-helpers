import { expect, test } from "vitest";
import createCors from "../src/index";

test("creates a cors middleware function", () => {
  const cors = createCors();
  expect(typeof cors).toBe("function");
});

test("allows CORS for default options (origin: *)", async () => {
  const cors = createCors();
  const req = new Request("http://localhost/data", {
    method: "GET",
    headers: {
      origin: "http://example.com",
    },
  });
  const baseRes = new Response("ok");
  const res = await cors(req, baseRes);
  console.log(res.headers.get("Access-Control-Allow-Origin"));
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");
});

test("returns preflight response when OPTIONS and origin allowed", async () => {
  const cors = createCors();
  const req = new Request("http://localhost/data", {
    method: "OPTIONS",
    headers: {
      origin: "http://example.com",
    },
  });
  const baseRes = new Response("unused");
  const res = await cors(req, baseRes);
  expect(res.status).toBe(204);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");
  expect(res.headers.get("Access-Control-Allow-Methods")).toBe("*");
});

test("blocks CORS when origin is not allowed", async () => {
  const cors = createCors({ origins: "http://allow.local" });
  const req = new Request("http://localhost/data", {
    method: "GET",
    headers: {
      origin: "http://deny.local",
    },
  });
  const baseRes = new Response("hi");
  const res = await cors(req, baseRes);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
});

test("allows CORS for exact string origin", async () => {
  const cors = createCors({ origins: "https://foo.com" });
  const req = new Request("http://somesite.org/data", {
    method: "GET",
    headers: { origin: "https://foo.com" },
  });
  const res = await cors(req, new Response("bar"));
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
    "https://foo.com"
  );
});

test("applies exposeHeaders", async () => {
  const cors = createCors({ exposeHeaders: ["Content-Type", "Authorization"] });
  const req = new Request("http://localhost/data", {
    method: "GET",
    headers: { origin: "http://site.com" },
  });
  const res = await cors(req, new Response("ok"));
  expect(res.headers.get("Access-Control-Expose-Headers")).toContain(
    "Content-Type"
  );
  expect(res.headers.get("Access-Control-Expose-Headers")).toContain(
    "Authorization"
  );
});

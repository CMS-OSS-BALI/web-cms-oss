import { NextResponse } from "next/server";
import swaggerJSDoc from "swagger-jsdoc";
import path from "path";
import YAML from "yaml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const swaggerEnabled =
  process.env.NEXT_PUBLIC_ENABLE_SWAGGER === "true" ||
  process.env.NODE_ENV !== "production";

// Normalisasi path agar glob swagger-jsdoc terbaca di Windows maupun Unix
const projectRoot = process.cwd().replace(/\\/g, "/");
const apiGlobs = [
  path.join(projectRoot, "app", "api", "**", "route.{js,ts,mjs,cjs}"),
  path.join(projectRoot, "app", "api", "**", "docs.{js,ts,mjs,cjs}"),
  path.join(projectRoot, "app", "api", "**", "*.{yaml,yml,json}"),
  path.join(projectRoot, "docs", "**", "*.{yaml,yml,json}"),
].map((pattern) => pattern.replace(/\\/g, "/"));

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CMS API Documentation",
      version: "1.0.0",
      description: "Dokumentasi API untuk sistem Web CMS",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: apiGlobs,
};

// Cache ringan agar tidak berat di production, tapi selalu fresh di dev
let cachedSpec = null;
let cachedAt = 0;
const CACHE_MS = process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 0;

function getBaseSpec() {
  const now = Date.now();
  const expired = !cachedSpec || now - cachedAt > CACHE_MS;
  if (expired) {
    cachedSpec = swaggerJSDoc(swaggerOptions);
    cachedAt = now;
  }
  return cachedSpec;
}

function buildServers(request) {
  const servers = [];

  if (process.env.NEXT_PUBLIC_SWAGGER_SERVER_URL) {
    servers.push({ url: process.env.NEXT_PUBLIC_SWAGGER_SERVER_URL });
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    servers.push({
      url: `${forwardedProto || "https"}://${forwardedHost}`,
    });
  } else if (request?.nextUrl?.origin) {
    servers.push({ url: request.nextUrl.origin });
  }

  return servers;
}

function wantsYaml(request) {
  const format = request.nextUrl.searchParams.get("format");
  if (format && format.toLowerCase() === "yaml") {
    return true;
  }

  const accept = (request.headers.get("accept") || "").toLowerCase();
  return accept.includes("yaml") || accept.includes("yml");
}

export async function GET(request) {
  if (!swaggerEnabled) {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  try {
    // Clone supaya base spec tetap bersih saat kita menambahkan server dinamis
    const spec = JSON.parse(JSON.stringify(getBaseSpec()));
    spec.servers = buildServers(request);

    if (wantsYaml(request)) {
      const yamlSpec = YAML.stringify(spec);
      return new NextResponse(yamlSpec, {
        status: 200,
        headers: {
          "Content-Type": "application/yaml",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(spec, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Swagger Error:", error);
    return NextResponse.json(
      { error: "Failed to generate OpenAPI spec" },
      { status: 500 }
    );
  }
}

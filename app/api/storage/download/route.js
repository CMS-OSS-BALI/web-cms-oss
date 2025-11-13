import { NextResponse } from "next/server";
import storageClient from "@/app/utils/storageClient";

const MIN_EXPIRES_SECONDS = 5;
const MAX_EXPIRES_SECONDS = 60 * 60; // 1 hour

function sanitizeKey(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeExpires(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  const bounded = Math.round(num);
  return Math.max(
    MIN_EXPIRES_SECONDS,
    Math.min(MAX_EXPIRES_SECONDS, bounded)
  );
}

function extractPayload(raw, fallbackExpires) {
  const url =
    raw?.url ||
    raw?.downloadUrl ||
    raw?.download_url ||
    raw?.signedUrl ||
    raw?.signed_url ||
    raw?.publicUrl ||
    raw?.public_url ||
    null;

  const expiresIn =
    raw?.expiresIn ?? raw?.expires_in ?? fallbackExpires ?? null;

  return {
    url,
    downloadUrl: raw?.downloadUrl ?? raw?.download_url ?? url,
    download_url: raw?.download_url ?? raw?.downloadUrl ?? url,
    signedUrl: raw?.signedUrl ?? raw?.signed_url ?? url,
    signed_url: raw?.signed_url ?? raw?.signedUrl ?? url,
    publicUrl: raw?.publicUrl ?? raw?.public_url ?? url,
    public_url: raw?.public_url ?? raw?.publicUrl ?? url,
    expiresIn,
    expires_in: expiresIn,
    raw: raw ?? null,
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function createDownloadResponse(key, expiresIn) {
  const cleanKey = sanitizeKey(key);
  if (!cleanKey) {
    return NextResponse.json(
      { message: "Parameter key wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const raw = await storageClient.createDownload({
      key: cleanKey,
      expiresIn,
    });
    const payload = extractPayload(raw, expiresIn);
    if (!payload.url) {
      return NextResponse.json(
        { message: "Storage tidak mengembalikan URL unduhan." },
        { status: 502 }
      );
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("storage-download:error", error);
    const status =
      typeof error?.status === "number" && !Number.isNaN(error.status)
        ? error.status
        : 500;
    const message =
      error?.message || "Gagal membuat download URL dari storage.";
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request) {
  const body = await readJson(request);
  const expiresIn = normalizeExpires(body?.expiresIn ?? body?.expires_in);
  return createDownloadResponse(body?.key, expiresIn);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const expiresIn = normalizeExpires(searchParams.get("expiresIn"));
  return createDownloadResponse(searchParams.get("key"), expiresIn);
}

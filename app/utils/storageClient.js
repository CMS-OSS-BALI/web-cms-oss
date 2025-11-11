// utils/storageClient.js
// Lightweight client for external object storage service (OSS)
// Wraps POST /api/storage/create-upload, POST /api/storage/confirm,
// and POST /api/storage/create-download. Uses fetch.
//
// Env (server or client; client won't see secrets unless exposed):
// - OSS_STORAGE_BASE_URL: base URL for the storage gateway. When falsy, use relative paths.
// - OSS_STORAGE_API_KEY:   API key sent as x-api-key header when provided.

function joinUrl(base, path) {
  if (!base) return path; // relative
  return base.replace(/\/?$/, "") + path;
}

function apiHeaders(extra) {
  const headers = { "content-type": "application/json" };
  const apiKey = process.env.OSS_STORAGE_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;
  return { ...headers, ...(extra || {}) };
}

async function toJsonOrThrow(res, defaultMessage) {
  let payload = null;
  try {
    payload = await res.json();
  } catch (_) {
    // ignore
  }
  if (!res.ok) {
    const message =
      payload?.message || defaultMessage || `Storage API error (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

function guessExt(filename) {
  const parts = String(filename || "").split(".");
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    if (ext && /^[a-z0-9]+$/.test(ext)) return ext;
  }
  return "bin";
}

function isFileLike(value) {
  // Works for Web File/Blob and simple test doubles
  return (
    value &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    "size" in value
  );
}

function hasHeaderCaseInsensitive(headersObj, name) {
  const n = String(name).toLowerCase();
  for (const k of Object.keys(headersObj || {})) {
    if (k.toLowerCase() === n) return true;
  }
  return false;
}

export function createStorageClient(opts = {}) {
  const baseURL = opts.baseURL ?? process.env.OSS_STORAGE_BASE_URL ?? "";

  return {
    baseURL,

    async createUpload({
      mime,
      ext,
      folder = "pengajuan",
      isPublic, // leave undefined unless explicitly passed
      checksum,
      expiresIn,
      metadata,
    } = {}) {
      const body = { mime, ext, folder };
      if (isPublic !== undefined) body.isPublic = isPublic;
      if (checksum) body.checksum = checksum;
      if (expiresIn) body.expiresIn = expiresIn;
      if (metadata) {
        // Allow metadata.isPublic to drive visibility if explicit isPublic was not passed
        if (metadata.isPublic !== undefined && isPublic === undefined) {
          body.isPublic = metadata.isPublic;
        }
        body.metadata = metadata;
      }

      const res = await fetch(joinUrl(baseURL, "/api/storage/create-upload"), {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      const json = await toJsonOrThrow(res, "Gagal membuat upload URL.");

      // Normalize keys from various gateways
      const uploadUrl = json.uploadUrl || json.url || json.upload_url;
      const key = json.key || json.objectKey || json.object_key;
      const uploadHeaders = json.uploadHeaders || json.headers || {};
      const publicUrl = json.publicUrl || json.public_url || json.url || null;
      const expires = json.expiresIn || json.expires_in || null;
      const method = (json.method || "PUT").toString().toUpperCase();
      const fields = json.fields || json.formFields || null; // for POST form uploads

      if (!uploadUrl || !key) {
        const err = new Error("Respon create-upload tidak lengkap.");
        err.payload = json;
        throw err;
      }
      return {
        uploadUrl,
        key,
        headers: uploadHeaders,
        publicUrl,
        expiresIn: expires,
        method,
        fields,
      };
    },

    async confirmUpload({ key, etag, size }) {
      const res = await fetch(joinUrl(baseURL, "/api/storage/confirm"), {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ key, etag, size }),
      });
      const json = await toJsonOrThrow(res, "Gagal konfirmasi upload.");
      const publicUrl = json.publicUrl || json.public_url || json.url || null;
      return { ...json, publicUrl };
    },

    async createDownload({ key, expiresIn }) {
      const res = await fetch(
        joinUrl(baseURL, "/api/storage/create-download"),
        {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ key, expiresIn }),
        }
      );
      return toJsonOrThrow(res, "Gagal membuat download URL.");
    },

    /**
     * Uploads a File/Blob using a presigned URL.
     * Supports:
     *  - PUT + headers (typical S3/MinIO)
     *  - POST form uploads with fields (S3 POST policy)
     */
    async uploadBufferWithPresign(
      fileOrBlob,
      {
        folder = "pengajuan",
        isPublic = true,
        expiresIn,
        baseURL: overrideBaseURL,
      } = {}
    ) {
      if (!isFileLike(fileOrBlob)) {
        throw new Error("File tidak valid untuk diunggah.");
      }

      const file = fileOrBlob;
      const mime = file.type || "application/octet-stream";
      const ext = guessExt(file.name);

      const client = overrideBaseURL
        ? createStorageClient({ baseURL: overrideBaseURL })
        : this;

      const {
        uploadUrl,
        key,
        headers: presignHeaders,
        publicUrl: presignedPublicUrl,
        method,
        fields,
      } = await client.createUpload({
        mime,
        ext,
        folder,
        isPublic,
        expiresIn,
      });

      // ===== Upload phase
      if (method === "POST" && fields) {
        // S3-style POST policy: send multipart/form-data with fields + file
        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, v));
        // Some policies expect the filename field name to be "file"
        form.append("file", file, file.name || `upload.${ext}`);

        const postRes = await fetch(uploadUrl, {
          method: "POST",
          body: form,
        });
        if (!postRes.ok) {
          const err = new Error(`Upload gagal (${postRes.status}).`);
          try {
            err.body = await postRes.text();
          } catch (_) {}
          throw err;
        }
      } else {
        // Default: PUT upload (binary body)
        const extraHeaders = { ...(presignHeaders || {}) };
        if (!hasHeaderCaseInsensitive(extraHeaders, "content-type")) {
          // only set if not already specified by presign
          extraHeaders["content-type"] = mime;
        }
        const body = file.stream ? file : await file.arrayBuffer();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: extraHeaders,
          body,
        });
        if (!putRes.ok) {
          const err = new Error(`Upload gagal (${putRes.status}).`);
          try {
            err.body = await putRes.text();
          } catch (_) {}
          throw err;
        }
      }

      // Try to read ETag from the HEAD/response is unreliable for POST; skip if absent
      // For PUT, some CDNs return ETag; no harm if undefined
      const size =
        typeof file.size === "number"
          ? file.size
          : (await file.arrayBuffer()).byteLength;

      let etag;
      try {
        // Best-effort: some environments expose last response via fetch? Not standard.
        // Keep undefined; server can compute on confirm if needed.
        etag = undefined;
      } catch (_) {}

      const confirmed = await client.confirmUpload({ key, etag, size });

      // Prefer confirm's URL; fall back to presigned advertised public URL
      const publicUrl =
        confirmed.publicUrl || confirmed.url || presignedPublicUrl || null;

      return { key, publicUrl, etag, size, raw: confirmed };
    },
  };
}

// Default singleton client using env configuration
const defaultClient = createStorageClient();
export default defaultClient;

// app/utils/cropper.js  (BROWSER + SERVER HYBRID)
/**
 * Crop center sesuai rasio lalu resize ke target size.
 * - Menghormati EXIF orientation (via createImageBitmap bila tersedia).
 * - Client: pakai Canvas; Server: gunakan Sharp pada helper khusus WebP.
 * - Prefer WebP bila didukung, fallback ke JPEG/PNG di client.
 */

function makePseudoFileFromBuffer(buffer, { name, type }) {
  if (typeof Buffer === "undefined") {
    throw new Error("Buffer is not available in this environment.");
  }
  const nodeBuffer =
    buffer && Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  const size = nodeBuffer.byteLength;
  const slice = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength
  );
  return {
    name,
    type,
    size,
    arrayBuffer: async () => slice,
  };
}

export async function cropCenterAndResize(
  imageFile,
  {
    aspect = "16:9",
    width,
    height,
    mimeType,
    quality = 0.92,
    asFile = true,
    background = null,
  } = {}
) {
  if (!(imageFile instanceof File)) {
    throw new Error('Parameter "imageFile" harus berupa File.');
  }

  const { aw, ah } = parseAspect(aspect);

  // Derivasi width/height
  if (!width && !height) {
    width = 400;
    height = Math.round((width * ah) / aw);
  } else if (!width) {
    width = Math.round((height * aw) / ah);
  } else if (!height) {
    height = Math.round((width * ah) / aw);
  }

  const typeWanted =
    mimeType || ((await preferWebP()) ? "image/webp" : "image/jpeg");

  // Decode dengan menjaga orientation
  let srcW,
    srcH,
    drawSource,
    revokeUrl = null,
    useBitmap = false;
  try {
    if ("createImageBitmap" in window) {
      try {
        const bmp = await createImageBitmap(imageFile, {
          imageOrientation: "from-image",
        });
        srcW = bmp.width;
        srcH = bmp.height;
        drawSource = bmp;
        useBitmap = true;
      } catch {
        ({ srcW, srcH, drawSource, revokeUrl } = await loadImageElement(
          imageFile
        ));
      }
    } else {
      ({ srcW, srcH, drawSource, revokeUrl } = await loadImageElement(
        imageFile
      ));
    }

    const targetAspect = aw / ah;
    const srcAspect = srcW / srcH;
    let sx = 0,
      sy = 0,
      sw = srcW,
      sh = srcH;

    if (srcAspect > targetAspect) {
      // crop kiri-kanan
      sw = Math.round(srcH * targetAspect);
      sx = Math.round((srcW - sw) / 2);
    } else {
      // crop atas-bawah
      sh = Math.round(srcW / targetAspect);
      sy = Math.round((srcH - sh) / 2);
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context tidak tersedia.");

    // Background opsional (untuk JPEG/WebP)
    if (background && isOpaqueType(typeWanted)) {
      ctx.save();
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    ctx.drawImage(
      drawSource,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Simpan -> coba typeWanted, fallback JPEG, lalu PNG
    const blob =
      (await canvasToBlobSafe(canvas, typeWanted, quality)) ||
      (await canvasToBlobSafe(canvas, "image/jpeg", quality)) ||
      (await canvasToBlobSafe(canvas, "image/png", 1));

    if (!blob) throw new Error("Gagal membuat Blob dari canvas.");

    if (!asFile) return blob;

    const ext = pickExt(blob.type || typeWanted);
    const base = imageFile.name.replace(/\.[^/.]+$/, "");
    const newName = `${base}_${aw}x${ah}_${canvas.width}x${canvas.height}.${ext}`;
    return new File([blob], newName, { type: blob.type || typeWanted });
  } finally {
    try {
      if (useBitmap && drawSource?.close) drawSource.close();
    } catch {}
    if (revokeUrl) {
      try {
        URL.revokeObjectURL(revokeUrl);
      } catch {}
    }
  }
}

/* ===== Helpers untuk rasio spesifik (Canvas/Client) ===== */
export function cropCenterAndResize16x9(imageFile, width = 1280, height) {
  return cropCenterAndResize(imageFile, { aspect: "16:9", width, height });
}
export function cropCenterAndResize9x16(imageFile, height = 1920, width) {
  return cropCenterAndResize(imageFile, { aspect: "9:16", width, height });
}
export function cropCenterAndResize1x1(imageFile, size = 1080) {
  return cropCenterAndResize(imageFile, {
    aspect: "1:1",
    width: size,
    height: size,
  });
}

/* =========================
   Util internal (client)
========================= */
function parseAspect(a) {
  if (typeof a === "number") return { aw: a, ah: 1 };
  const s = String(a || "1:1").trim();
  if (/^\d+(\.\d+)?$/.test(s)) return { aw: Number(s), ah: 1 };
  const [x, y] = s.split(":").map(Number);
  if (!x || !y)
    throw new Error('Aspect ratio tidak valid. Contoh: "16:9", "9:16", "1:1".');
  return { aw: x, ah: y };
}

async function loadImageElement(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await new Promise((res, rej) => {
    if (img.decode) {
      img
        .decode()
        .then(res)
        .catch(() => {
          img.onload = res;
          img.onerror = rej;
        });
    } else {
      img.onload = res;
      img.onerror = rej;
    }
  });
  return {
    srcW: img.naturalWidth || img.width,
    srcH: img.naturalHeight || img.height,
    drawSource: img,
    revokeUrl: url,
  };
}

function canvasToBlobSafe(canvas, type, quality) {
  return new Promise((resolve) => {
    try {
      if (canvas.toBlob) {
        canvas.toBlob((b) => resolve(b || null), type, quality);
      } else {
        const dataURL = canvas.toDataURL(type, quality);
        const m = dataURL.match(/^data:([^;]+);base64,(.*)$/);
        if (!m) return resolve(null);
        const bin = atob(m[2]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(
          new Blob([arr], { type: m[1] || type || "application/octet-stream" })
        );
      }
    } catch {
      resolve(null);
    }
  });
}

function isOpaqueType(type) {
  return /^image\/jpe?g$/i.test(type) || /^image\/webp$/i.test(type);
}
function pickExt(type) {
  if (/image\/webp/i.test(type)) return "webp";
  if (/image\/png/i.test(type)) return "png";
  if (/image\/jpe?g/i.test(type)) return "jpg";
  return "bin";
}

function extFromFile(file) {
  if (!file) return null;
  const name = file.name || "";
  const match = /\.([a-z0-9]+)$/i.exec(name);
  if (match) return match[1].toLowerCase();
  const viaType = pickExt(file.type || "");
  return viaType === "bin" ? null : viaType;
}

let _webpSupport;
async function preferWebP() {
  if (_webpSupport !== undefined) return _webpSupport;
  try {
    const c = document.createElement("canvas");
    _webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    _webpSupport = false;
  }
  return _webpSupport;
}

/* ===========================================================
   HYBRID (SERVER via sharp / CLIENT via canvas) -> Return WebP
   - Server: { buffer, contentType: "image/webp", ext: "webp" }
   - Client: { file, buffer, contentType, ext }
   Catatan: Di server (route handlers) gunakan object.buffer untuk upload.
=========================================================== */

/* ===== 16:9 WebP ===== */
export async function cropFileTo16x9Webp(
  file,
  { width = 1280, height, quality = 90 } = {}
) {
  const targetWidth = Number.isFinite(width)
    ? Math.max(1, Math.trunc(width))
    : 1280;
  const targetHeight = Number.isFinite(height)
    ? Math.max(1, Math.trunc(height))
    : Math.round((targetWidth * 9) / 16);
  const q = Math.max(1, Math.min(100, Math.trunc(quality || 90)));

  if (typeof window === "undefined") {
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    try {
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default || sharpModule;
      const processed = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: targetWidth,
          height: targetHeight,
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: q })
        .toBuffer();
      return {
        file: makePseudoFileFromBuffer(processed, {
          name: `crop-${targetWidth}x${targetHeight}.webp`,
          type: "image/webp",
        }),
        buffer: processed,
        contentType: "image/webp",
        ext: "webp",
      };
    } catch (_) {
      return {
        file: makePseudoFileFromBuffer(inputBuffer, {
          name: `crop-${targetWidth}x${targetHeight}.${extFromFile(file) || pickExt(file.type || "") || "bin"}`,
          type: file.type || "application/octet-stream",
        }),
        buffer: inputBuffer,
        contentType: file.type || "application/octet-stream",
        ext: extFromFile(file) || pickExt(file.type || "") || "bin",
      };
    }
  }

  const processed = await cropCenterAndResize(file, {
    aspect: "16:9",
    width: targetWidth,
    height: targetHeight,
    mimeType: "image/webp",
    quality: q / 100,
    asFile: true,
  });
  const blobBuffer = await processed.arrayBuffer();
  return {
    file: processed,
    buffer: blobBuffer,
    contentType: processed.type || "image/webp",
    ext: pickExt(processed.type || "image/webp"),
  };
}

/* ===== 9:16 WebP ===== */
export async function cropFileTo9x16Webp(
  file,
  { height = 1920, width, quality = 90 } = {}
) {
  const targetHeight = Number.isFinite(height)
    ? Math.max(1, Math.trunc(height))
    : 1920;
  const targetWidth = Number.isFinite(width)
    ? Math.max(1, Math.trunc(width))
    : Math.round((targetHeight * 9) / 16);
  const q = Math.max(1, Math.min(100, Math.trunc(quality || 90)));

  if (typeof window === "undefined") {
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    try {
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default || sharpModule;
      const processed = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: targetWidth,
          height: targetHeight,
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: q })
        .toBuffer();
      return {
        file: makePseudoFileFromBuffer(processed, {
          name: `crop-${targetWidth}x${targetHeight}.webp`,
          type: "image/webp",
        }),
        buffer: processed,
        contentType: "image/webp",
        ext: "webp",
      };
    } catch (_) {
      return {
        file: makePseudoFileFromBuffer(inputBuffer, {
          name: `crop-${targetWidth}x${targetHeight}.${extFromFile(file) || pickExt(file.type || "") || "bin"}`,
          type: file.type || "application/octet-stream",
        }),
        buffer: inputBuffer,
        contentType: file.type || "application/octet-stream",
        ext: extFromFile(file) || pickExt(file.type || "") || "bin",
      };
    }
  }

  const processed = await cropCenterAndResize(file, {
    aspect: "9:16",
    width: targetWidth,
    height: targetHeight,
    mimeType: "image/webp",
    quality: q / 100,
    asFile: true,
  });
  const blobBuffer = await processed.arrayBuffer();
  return {
    file: processed,
    buffer: blobBuffer,
    contentType: processed.type || "image/webp",
    ext: pickExt(processed.type || "image/webp"),
  };
}

/* ===== 1:1 WebP ===== */
export async function cropFileTo1x1Webp(
  file,
  { size = 720, quality = 90 } = {}
) {
  const target = Number.isFinite(size) ? Math.max(1, Math.trunc(size)) : 720;
  const q = Math.max(1, Math.min(100, Math.trunc(quality || 90)));

  if (typeof window === "undefined") {
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    try {
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default || sharpModule;
      const processed = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: target,
          height: target,
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: q })
        .toBuffer();
      return {
        file: makePseudoFileFromBuffer(processed, {
          name: `crop-${target}x${target}.webp`,
          type: "image/webp",
        }),
        buffer: processed,
        contentType: "image/webp",
        ext: "webp",
      };
    } catch (_) {
      // fallback: kirim file asli agar upload tidak gagal total
      return {
        file: makePseudoFileFromBuffer(inputBuffer, {
          name: `crop-${target}x${target}.${extFromFile(file) || pickExt(file.type || "") || "bin"}`,
          type: file.type || "application/octet-stream",
        }),
        buffer: inputBuffer,
        contentType: file.type || "application/octet-stream",
        ext: extFromFile(file) || pickExt(file.type || "") || "bin",
      };
    }
  }

  const processed = await cropCenterAndResize(file, {
    aspect: "1:1",
    width: target,
    height: target,
    mimeType: "image/webp",
    quality: q / 100,
    asFile: true,
  });
  const blobBuffer = await processed.arrayBuffer();
  return {
    file: processed,
    buffer: blobBuffer,
    contentType: processed.type || "image/webp",
    ext: pickExt(processed.type || "image/webp"),
  };
}

/* ===== alias kompatibilitas ===== */
export const cropTo16x9Webp = cropFileTo16x9Webp;
export const cropTo9x16Webp = cropFileTo9x16Webp;
export const cropTo1x1Webp = cropFileTo1x1Webp;

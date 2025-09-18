// lib/geminiTranslator.js

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function buildPrompt(text, from = "id", to = "en") {
  return `Terjemahkan teks berikut dari ${from} ke ${to}. Jangan terjemahkan nama tempat atau nama perusahaan. 
Berikan hasil langsung tanpa tambahan \`\`\`html atau tanda kutip lainnya. Cukup kirim teks terjemahannya saja.

${text}`;
}

/**
 * Translate text using Google Gemini.
 * @param {string} text
 * @param {string} [from="id"]
 * @param {string} [to="en"]
 * @returns {Promise<string>}
 */
export async function translate(text, from = "id", to = "en") {
  if (!text) return "";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[GeminiTranslator] Missing GEMINI_API_KEY");
    return text; // fallback
  }

  const url = `${ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        parts: [{ text: buildPrompt(text, from, to) }],
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Note: fetch tersedia di Next.js/Node 18+; jika perlu di lingkungan lain, pakai `node-fetch`.
      body: JSON.stringify(body),
      // cache: "no-store", // opsional jika dipakai di Next.js route
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Gemini API error ${res.status}: ${res.statusText} ${errText}`
      );
    }

    const data = await res.json();
    // Ambil teks dari struktur kandidat
    const out =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ?? text;

    // Jika API mengembalikan kosong, fallback ke input
    return out || text;
  } catch (e) {
    console.warn("[GeminiTranslator] Translate failed:", e?.message || e);
    return text; // fallback aman
  }
}

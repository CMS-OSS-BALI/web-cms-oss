// app/utils/watzap.js
import axios from "axios";

// Normalisasi ke "62xxxxxxxxx" (tanpa plus)
export function formatPhoneNumber(phone) {
  let p = String(phone || "").trim();
  p = p.replace(/[^\d+]/g, "");
  if (p.startsWith("+62")) return p.slice(1);
  if (p.startsWith("62")) return p;
  if (p.startsWith("0")) return "62" + p.slice(1);
  if (p.startsWith("+")) return p.slice(1);
  return p;
}

function getKeys() {
  const api_key =
    process.env.API_KEY_WATZAP || process.env.NEXT_PUBLIC_API_KEY_WATZAP;
  const number_key =
    process.env.NUMBER_KEY_WATZAP || process.env.NEXT_PUBLIC_NUMBER_KEY_WATZAP;
  const baseURL = process.env.WATZAP_BASE_URL || "https://api.watzap.id/v1";
  if (!api_key || !number_key) {
    throw new Error(
      "Missing Watzap API keys. Set API_KEY_WATZAP & NUMBER_KEY_WATZAP"
    );
  }
  return { api_key, number_key, baseURL };
}

export async function sendWhatsAppMessage(phoneNo, message) {
  const { api_key, number_key, baseURL } = getKeys();
  const phone_no = formatPhoneNumber(phoneNo);
  try {
    const { data } = await axios.post(
      `${baseURL}/send_message`,
      { api_key, number_key, phone_no, message, wait_until_send: "1" },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );
    // beberapa API mengembalikan { status: true/false } atau { success: 1/0 }
    const ok =
      data?.status === true || data?.success === true || data?.success === 1;
    if (!ok) {
      console.error("Watzap send_message unexpected response:", data);
    }
    return data;
  } catch (err) {
    console.error(
      "Watzap send_message error:",
      err?.response?.data || err.message
    );
    throw err;
  }
}

export async function sendWhatsAppFile(phoneNo, fileUrl) {
  const { api_key, number_key, baseURL } = getKeys();
  const phone_no = formatPhoneNumber(phoneNo);
  try {
    const { data } = await axios.post(
      `${baseURL}/send_file_url`,
      { api_key, number_key, phone_no, url: fileUrl, wait_until_send: "1" },
      { timeout: 20000, headers: { "Content-Type": "application/json" } }
    );
    const ok =
      data?.status === true || data?.success === true || data?.success === 1;
    if (!ok) {
      console.error("Watzap send_file_url unexpected response:", data);
    }
    return data;
  } catch (err) {
    console.error(
      "Watzap send_file_url error:",
      err?.response?.data || err.message
    );
    throw err;
  }
}

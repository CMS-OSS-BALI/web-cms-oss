// watzap.js
import axios from "axios";

// Format nomor WA ke internasional
export function formatPhoneNumber(phone) {
  const p = String(phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+62")) return p.slice(1);
  if (p.startsWith("62")) return p;
  if (p.startsWith("0")) return "62" + p.slice(1);
  return p;
}

// Kirim pesan teks saja
export async function sendWhatsAppMessage(phoneNo, message) {
  // NOTE: lebih aman gunakan API_KEY_WATZAP & NUMBER_KEY_WATZAP (tanpa NEXT_PUBLIC_) di sisi server
  const apiKey =
    process.env.API_KEY_WATZAP || process.env.NEXT_PUBLIC_API_KEY_WATZAP;
  const numberKey =
    process.env.NUMBER_KEY_WATZAP || process.env.NEXT_PUBLIC_NUMBER_KEY_WATZAP;

  const phone = formatPhoneNumber(phoneNo);

  return axios.post("https://api.watzap.id/v1/send_message", {
    api_key: apiKey,
    number_key: numberKey,
    phone_no: phone,
    message,
    wait_until_send: "1",
  });
}

// Kirim file saja
export async function sendWhatsAppFile(phoneNo, fileUrl) {
  const apiKey =
    process.env.API_KEY_WATZAP || process.env.NEXT_PUBLIC_API_KEY_WATZAP;
  const numberKey =
    process.env.NUMBER_KEY_WATZAP || process.env.NEXT_PUBLIC_NUMBER_KEY_WATZAP;

  const phone = formatPhoneNumber(phoneNo);

  return axios.post("https://api.watzap.id/v1/send_file_url", {
    api_key: apiKey,
    number_key: numberKey,
    phone_no: phone,
    url: fileUrl,
    wait_until_send: "1",
  });
}

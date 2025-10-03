// watzap.js
import axios from "axios";

// Format nomor WA ke internasional (Indonesia default 62)
// Output: hanya digit, diawali "62" (tanpa plus) sesuai API Watzap.
export function formatPhoneNumber(phone) {
  let p = String(phone || "").trim();
  p = p.replace(/[^\d+]/g, "");

  // +62xxxx -> 62xxxx
  if (p.startsWith("+62")) return p.slice(1);
  // 62xxxx -> 62xxxx
  if (p.startsWith("62")) return p;
  // 0xxxx -> 62xxxx
  if (p.startsWith("0")) return "62" + p.slice(1);

  // Kalau user masukin selain itu (misal +1...), hapus +
  if (p.startsWith("+")) return p.slice(1);
  return p;
}

function getKeys() {
  // PAKAI ENV SERVER-SIDE (tanpa NEXT_PUBLIC) kalau dipanggil di route API
  const api_key =
    process.env.API_KEY_WATZAP || process.env.NEXT_PUBLIC_API_KEY_WATZAP;
  const number_key =
    process.env.NUMBER_KEY_WATZAP || process.env.NEXT_PUBLIC_NUMBER_KEY_WATZAP;
  if (!api_key || !number_key) {
    throw new Error(
      "Missing Watzap API keys. Set API_KEY_WATZAP & NUMBER_KEY_WATZAP"
    );
  }
  return { api_key, number_key };
}

export async function sendWhatsAppMessage(phoneNo, message) {
  const { api_key, number_key } = getKeys();
  const phone_no = formatPhoneNumber(phoneNo);
  try {
    const { data } = await axios.post("https://api.watzap.id/v1/send_message", {
      api_key,
      number_key,
      phone_no,
      message,
      wait_until_send: "1",
    });
    return data;
  } catch (err) {
    // log detail buat debugging
    console.error(
      "Watzap send_message error:",
      err?.response?.data || err.message
    );
    throw err;
  }
}

export async function sendWhatsAppFile(phoneNo, fileUrl) {
  const { api_key, number_key } = getKeys();
  const phone_no = formatPhoneNumber(phoneNo);
  try {
    const { data } = await axios.post(
      "https://api.watzap.id/v1/send_file_url",
      {
        api_key,
        number_key,
        phone_no,
        url: fileUrl,
        wait_until_send: "1",
      }
    );
    return data;
  } catch (err) {
    console.error(
      "Watzap send_file_url error:",
      err?.response?.data || err.message
    );
    throw err;
  }
}

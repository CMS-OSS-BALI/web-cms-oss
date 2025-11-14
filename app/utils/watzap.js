// app/utils/watzap.js
import "server-only";
import axios from "axios";

const DEFAULT_BASE_URL = "https://api.watzap.id/v1";

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

function getServerKeys() {
  const api_key = process.env.API_KEY_WATZAP;
  const number_key = process.env.NUMBER_KEY_WATZAP;
  const baseURL = process.env.WATZAP_BASE_URL || DEFAULT_BASE_URL;
  if (!api_key || !number_key) {
    throw new Error(
      "Missing Watzap API keys. Set API_KEY_WATZAP & NUMBER_KEY_WATZAP"
    );
  }
  return { api_key, number_key, baseURL };
}

function logWatzapError(context, err) {
  const status = err?.response?.status;
  const remote =
    err?.response?.data && typeof err.response.data === "object"
      ? {
          status: err.response.data.status,
          code: err.response.data.code,
          error: err.response.data.error,
          message: err.response.data.message,
        }
      : undefined;
  console.error("[Watzap]", context, {
    message: err?.message,
    status,
    code: err?.code,
    response: remote,
  });
}

function logGatewayWarning(context, payload) {
  const safe =
    payload && typeof payload === "object"
      ? {
          status:
            payload.status ?? payload.success ?? payload.status_code ?? null,
          code: payload.code ?? payload.error_code ?? null,
          message: payload.message ?? payload.error ?? null,
        }
      : undefined;
  console.warn("[Watzap]", context, safe);
}

export async function sendWhatsAppMessage(phoneNo, message) {
  const { api_key, number_key, baseURL } = getServerKeys();
  const phone_no = formatPhoneNumber(phoneNo);
  try {
    const { data } = await axios.post(
      `${baseURL}/send_message`,
      { api_key, number_key, phone_no, message, wait_until_send: "1" },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );
    const ok =
      data?.status === true || data?.success === true || data?.success === 1;
    if (!ok) logGatewayWarning("send_message unexpected response", data);
    return data;
  } catch (err) {
    logWatzapError("send_message error", err);
    throw err;
  }
}

export async function sendWhatsAppFile(phoneNo, fileUrl) {
  const { api_key, number_key, baseURL } = getServerKeys();
  const phone_no = formatPhoneNumber(phoneNo);
  try {
    const { data } = await axios.post(
      `${baseURL}/send_file_url`,
      { api_key, number_key, phone_no, url: fileUrl, wait_until_send: "1" },
      { timeout: 20000, headers: { "Content-Type": "application/json" } }
    );
    const ok =
      data?.status === true || data?.success === true || data?.success === 1;
    if (!ok) logGatewayWarning("send_file_url unexpected response", data);
    return data;
  } catch (err) {
    logWatzapError("send_file_url error", err);
    throw err;
  }
}

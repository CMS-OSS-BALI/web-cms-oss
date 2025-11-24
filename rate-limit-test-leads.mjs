// rate-limit-test-leads.mjs
import fetch from "node-fetch";

const URL = "https://home.onestepsolutionbali.com/api/leads";
const LIMIT = 60; // sesuai limit email leads

async function main() {
  for (let i = 1; i <= LIMIT + 2; i++) {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Tester " + i,
        email: "tester@example.com",
        whatsapp: "08123456789",
      }),
    });

    await res.json().catch(() => ({}));
  }
}

main().catch(console.error);

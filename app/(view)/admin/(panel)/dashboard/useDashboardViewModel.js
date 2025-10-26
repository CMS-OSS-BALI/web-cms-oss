export default function useDashboardViewModel({ locale = "id" } = {}) {
  const id = {
    badge: "Dalam Pengembangan",
    title: "Akan segera hadir",
    sub:
      "Dashboard sedang dalam tahap desain dan pengembangan. " +
      "Kami menyiapkan metrik utama, aktivitas terbaru, dan ringkasan penting.",
    backHome: "Kembali ke Beranda",
    notify: "Ingatkan saya",
  };

  const en = {
    badge: "In Progress",
    title: "Coming soon",
    sub:
      "The dashboard is currently being designed and developed. " +
      "We’re preparing core metrics, recent activity, and useful summaries.",
    backHome: "Back to Home",
    notify: "Notify me",
  };

  return {
    locale,
    T: locale === "en" ? en : id,
    tokens: {
      shellW: 1180,
      blue: "#0b56c9",
      text: "#0f172a",
      headerH: 84,
    },
  };
}

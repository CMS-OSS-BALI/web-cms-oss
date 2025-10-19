"use client";

const FONT_FAMILY = '"Poppins", sans-serif';

export default function useMitraDalamNegeriViewModel({ locale = "id" } = {}) {
  const t = (id, en) => (locale === "en" ? en : id);

  const hero = {
    title: t("MITRA DALAM NEGERI", "DOMESTIC PARTNERS"),
    bg: "/mitra-bg.svg",
  };

  const sections = {
    partner: {
      title: "PARTNER",
      body: t(
        "OSS membangun kemitraan strategis dengan lembaga pendidikan, institusi, dan brand global untuk menghadirkan program yang relevan dan berdampak. Kolaborasi mencakup pengembangan kurikulum, pertukaran pengetahuan, penyelenggaraan acara bersama, serta kanal rekrutmen dan magang bagi talenta muda. Kami mengutamakan transparansi, target yang terukur, dan keberlanjutan agar setiap kerja sama memberi nilai nyata bagi seluruh pemangku kepentingan.",
        "OSS builds strategic partnerships with schools, institutions, and global brands to deliver relevant, high-impact programs. Our collaboration spans curriculum co-development, knowledge exchange, joint events, and internship pipelines. We prioritize transparency, measurable outcomes, and sustainability to create tangible value for all stakeholders."
      ),
    },
    merchant: { title: "MERCHANT" },
    organization: { title: t("ORGANISASI", "ORGANIZATIONS") },
  };

  const merchants = Array.from({ length: 14 }).map((_, i) => ({
    id: `m${i + 1}`,
    name: "IMADJI Coffee",
    logo: "/imadji.svg",
  }));

  const organizations = Array.from({ length: 12 }).map((_, i) => ({
    id: `o${i + 1}`,
    name: "Organization",
    logo: "/imadji.svg",
  }));

  return { font: FONT_FAMILY, hero, sections, merchants, organizations };
}

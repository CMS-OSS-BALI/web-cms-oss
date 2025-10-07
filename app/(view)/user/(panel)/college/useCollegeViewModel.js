"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    return r.json();
  });

export default function useCollegeViewModel({ locale = "id" } = {}) {
  const t = (id, en) => (locale === "en" ? en : id);

  const { data } = useSWR(`/api/college?locale=${locale}`, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const vm = useMemo(() => {
    const api = data || {};
    return {
      hero: {
        titleLine1: api?.hero?.titleLine1 ?? t("KULIAH", "STUDY"),
        titleLine2: api?.hero?.titleLine2 ?? t("DI LUAR NEGERI", "ABROAD"),
        image: api?.hero?.image ?? "/canada-hero.svg",
        imageAlt: api?.hero?.imageAlt ?? t("Mahasiswa wisuda", "Graduate"),
        objectPosition: api?.hero?.objectPosition || "40% 50%",
      },
      findProgram: {
        title:
          api?.findProgram?.title ??
          t(
            "TEMUKAN PROGRAM KULIAH LUAR NEGERI TERBAIK UNTUKMU",
            "FIND YOUR PERFECT STUDY ABROAD PROGRAM"
          ),
      },
      popularMajors: api?.popularMajors ?? [
        {
          id: "data-analysis",
          title: t("Data Analysis", "Data Analysis"),
          icon: "/data-analysis.svg",
        },
        {
          id: "house-keeping",
          title: t("House Keeping", "House Keeping"),
          icon: "/house-keeping.svg",
        },
        {
          id: "tataboga",
          title: t("Tataboga", "Culinary Arts"),
          icon: "/tataboga.svg",
        },
      ],
      search: {
        label: api?.search?.label ?? t("Pencarian", "Search"),
        placeholder:
          api?.search?.placeholder ??
          t(
            "Cari program atau universitas (mis. IT, di Kanada)",
            "Search for program or university (e.g., IT, in Canada)"
          ),
        voiceHint:
          api?.search?.voiceHint ?? t("Ucapkan untuk mencari", "Tap to speak"),
        onSearchHref: api?.search?.onSearchHref ?? "/user/layanan?menu=layanan",
      },
      recommendedUniversity: {
        title:
          api?.recommendedUniversity?.title ??
          t("RECOMMENDED UNIVERSITY", "RECOMMENDED UNIVERSITY"),
        subtitle:
          api?.recommendedUniversity?.subtitle ??
          t(
            "Temukan jalurmu di universitas-universitas terkemuka dunia",
            "Find Your Path At Leading Universities Worldwide"
          ),
        relevantCampus: api?.recommendedUniversity?.relevantCampus ?? [
          { id: "bsbi", name: "BSBI", logo: "/bsbi.svg" },
          {
            id: "bradford",
            name: "University of Bradford",
            logo: "/univ-bradford.svg",
          },
          {
            id: "strathfield",
            name: "Strathfield College",
            logo: "/strathfield.svg",
          },
          {
            id: "queensford",
            name: "Queensford College",
            logo: "/queensford.svg",
          },
          { id: "bsbi-2", name: "BSBI", logo: "/bsbi.svg" },
          {
            id: "bradford-2",
            name: "University of Bradford",
            logo: "/univ-bradford.svg",
          },
          {
            id: "strathfield-2",
            name: "Strathfield College",
            logo: "/strathfield.svg",
          },
          {
            id: "queensford-2",
            name: "Queensford College",
            logo: "/queensford.svg",
          },
        ],
      },
      universities: api?.universities ?? [
        {
          id: "ucw",
          name: "University Canada West",
          logo: "/ucw.svg",
          excerpt: t(
            "Menjadi bagian dari Masa Depan Pendidikan dan Bisnis. UCW di Kanada adalah pilihan yang tepat bagi pelajar yang ingin berkarier global.",
            "Be part of the future of Education and Business. UCW in Canada is a great choice for globally-minded students."
          ),
          bullets: [
            { icon: "cap", text: "Foundation, HE" },
            { icon: "pin", text: "Canada - Vancouver" },
            { icon: "money", text: "$9,000 - $10,000 (CAD)" },
          ],
          rating: 4.5,
          href: "/universities/ucw",
        },
        {
          id: "eton",
          name: "Eton College",
          logo: "/eton.svg",
          excerpt: t(
            "Eton College adalah sekolah bergengsi dengan lingkungan belajar suportif dan jaringan industri yang kuat.",
            "Eton College is a prestigious school with a supportive learning environment and strong industry links."
          ),
          bullets: [
            { icon: "cap", text: "ESL, VET" },
            { icon: "pin", text: "Canada - Vancouver" },
            { icon: "money", text: "$7,000 - $8,000 (CAD)" },
          ],
          rating: 4.2,
          href: "/universities/eton-college",
        },
        {
          id: "kaplan",
          name: "Kaplan Business School",
          logo: "/kaplan.svg",
          excerpt: t(
            "Kaplan Business School menawarkan pendidikan bisnis dengan koneksi industri luas dan hasil lulusan yang kuat.",
            "Kaplan Business School delivers business education with strong industry connections and outcomes."
          ),
          bullets: [
            { icon: "cap", text: "ESL, VET" },
            { icon: "pin", text: "Canada - Vancouver" },
            { icon: "money", text: "$7,000 - $8,000 (CAD)" },
          ],
          rating: 4.1,
          href: "/universities/kaplan",
        },
      ],
      scholarshipCTA: {
        title:
          api?.scholarshipCTA?.title ??
          t(
            "TEMUKAN KESEMPATAN BEASISWAMU",
            "FIND YOUR SCHOLARSHIP OPPORTUNITIES"
          ),
        body:
          api?.scholarshipCTA?.body ??
          t(
            "Jelajahi Beasiswa Luar Negeri Dan Peluang Pendanaan Bagi Mahasiswa Dari Indonesia Sepertimu. Tersedia Lebih Dari 5,000 Beasiswa Dari Berbagai Universitas Di Luar Negeri.",
            "Explore overseas scholarships and funding opportunities. 5,000+ scholarships from universities abroad."
          ),
        ctaLabel: api?.scholarshipCTA?.ctaLabel ?? t("View More", "View More"),
        href: api?.scholarshipCTA?.href ?? "/scholarships",
      },
    };
  }, [data, locale]);

  return vm;
}

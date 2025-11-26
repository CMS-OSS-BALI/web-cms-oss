"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

/** ViewModel bilingual: semua teks/copy ada di sini. */
export default function useCareerViewModel({ locale = "id" } = {}) {
  const router = useRouter();
  const L = (id, en) => (locale === "en" ? en : id);

  /* HERO */
  const hero = useMemo(
    () => ({
      title: "LET’S JOIN WITH US",
      quote: "“Together We Dream, Together We Make It Real”",
      image: "/career-bg.svg",
      objectPosition: "35% 40%",
    }),
    []
  );

  /* CTA */
  const cta = useMemo(
    () => ({
      title: L("Jadi Bagian Team Kami", "Join Our Team"),
      subtitle: L(
        "Wujudkan Karier Impian, Temukan Peluang Baru, Dan Bangun Masa Depan Berdampak Bersama.",
        "Build your dream career, unlock new opportunities, and shape an impactful future together."
      ),
      btnJobs: L("Lowongan", "Vacancies"),
      btnReferral: L("Sahabat Referral", "Referral Buddy"),
    }),
    [locale]
  );

  /* LOWONGAN */
  const vacancy = useMemo(
    () => ({
      title: L("Lowongan", "Vacancies"),
      image: "/images/career-vacancy.svg",
      body: L(
        "Kesempatan lowongan kerja terbuka lebar bagi Anda yang siap bergabung menjadi staf kami dan berkontribusi bersama para Super Team OSS Bali. Temukan berbagai posisi yang tersedia dan pastikan kesesuaiannya dengan kompetensi yang Anda miliki. Untuk mempermudah proses evaluasi, silakan kirim CV terbaik Anda melalui tombol di bawah.",
        "Exciting openings are available for those ready to join the OSS Bali Super Team. Explore the roles, ensure they match your competencies, and send your best resume using the button below."
      ),
      btnLabel: L("Kirim CV", "Send CV"),
    }),
    [locale]
  );

  /* REFERRAL */
  const referral = useMemo(
    () => ({
      title: L("Sahabat Referral", "Referral Buddy"),
      leadBold: L(
        "Ingin Mendapatkan Penghasilan Tanpa Terikat Kontrak? ",
        "Want to Earn Without Binding Contracts? "
      ),
      desc: L(
        "Bergabunglah sebagai Sahabat Referral OSS Bali! Cukup rekomendasikan calon siswa yang berencana melanjutkan studi ke luar negeri, dan dapatkan insentif serta bonus menarik untuk setiap referensi yang berhasil. Bersama, kita bantu lebih banyak generasi muda mewujudkan impian global mereka!",
        "Join as an OSS Bali Referral Buddy! Recommend prospective students planning to study abroad and earn incentives and bonuses for every successful referral. Together, we help more young people realize their global dreams!"
      ),
      youtube: "https://youtu.be/Py1jA2EjCmk?si=qke7rB0X2BlWXHsv",
      benefitsTitle: L(
        "Manfaat Bergabung Dalam Program Sahabat Referral OSS Bali",
        "Benefits of Joining the OSS Bali Referral Program"
      ),
    }),
    [locale]
  );

  /* BENEFITS (6 item) */
  const benefits = useMemo(
    () => [
      {
        title: L("Penghasilan Tambahan Tanpa Batas", "Unlimited Extra Income"),
        icon: "/icons/benefit-income.svg",
      },
      {
        title: L(
          "Berperan Dalam Mewujudkan Impian Global",
          "Help Realize Global Dreams"
        ),
        icon: "/icons/benefit-global.svg",
      },
      {
        title: L("Tanpa Kontrak Atau Target", "No Contracts or Targets"),
        icon: "/icons/benefit-no-contract.svg",
      },
      {
        title: L("Transparan Dan Profesional", "Transparent and Professional"),
        icon: "/icons/benefit-transparent.svg",
      },
      {
        title: L(
          "Akses Informasi Dan Pelatihan Eksklusif",
          "Access to Exclusive Info & Training"
        ),
        icon: "/icons/benefit-training.svg",
      },
      {
        title: L("Bekerja Dari Rumah Atau Cafe", "Work From Home or Café"),
        icon: "/icons/benefit-remote.svg",
      },
    ],
    [locale]
  );

  /* ===== LEVELS (baru, 2 kartu) ===== */
  const levels = useMemo(
    () => [
      {
        id: "pro",
        variant: "pro",
        logo: "/logo-oss-cube-pro.svg",
        title: L("PRO SOLITAIRE LEVEL", "PRO SOLITAIRE LEVEL"),
        desc: L(
          "Keanggotaan Sahabat Referral OSS Bali tertinggi dengan akses eksklusif ke bonus komisi lebih besar dan trip luar negeri gratis tahunan.",
          "Top-tier OSS Bali Referral membership with exclusive access to higher commission bonuses and an annual free overseas trip."
        ),
      },
      {
        id: "basic",
        variant: "basic",
        logo: "/logo-oss-cube-basic.svg",
        title: L("BASIC LEVEL", "BASIC LEVEL"),
        desc: L(
          "Keanggotaan Sahabat Referral OSS Bali tingkat awal. Langkah pertama untuk mulai meraih penghasilan sederhana.",
          "Entry-level OSS Bali Referral membership. The first step to start earning simply."
        ),
      },
    ],
    [locale]
  );

  // 🔹 NEW: Judul section Level (dictionary)
  const levelsTitle = L(
    "Peluang Level Program Sahabat Referral OSS Bali",
    "Level Opportunities in the OSS Bali Referral Buddy Program"
  );

  const levelsCTA = L("Wujudkan sekarang!", "Make it happen!");
  const levelsHeroImg = "/images/referral-man-pointing.png";

  /* Actions */
  const onCTATeam = useCallback(() => {
    router.push("/career/team-member");
  }, [router]);

  const onCTAReferral = useCallback(() => {
    router.push("/user/apply");
  }, [router]);

  const onSendCV = useCallback(() => {
    router.push("/career/apply");
  }, [router]);

  const onLevelsCTA = onCTAReferral; // arahkan ke referral

  /* Assets */
  const ctaImage = "/cta-girl.svg";

  return {
    locale,
    hero,
    cta,
    vacancy,
    referral,
    benefits,
    levels,
    levelsTitle, // 🔹 dikirim ke luar
    levelsCTA,
    levelsHeroImg,
    onCTATeam,
    onCTAReferral,
    onSendCV,
    onLevelsCTA,
    ctaImage,
  };
}

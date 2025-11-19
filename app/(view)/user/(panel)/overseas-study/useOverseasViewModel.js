"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

/* ===== Level Kampus static content (fallback, nanti bisa diganti CMS/API) ===== */
const LEVEL_KAMPUS_CONTENT_ID = {
  heading: "Level Kampus",
  subtitle: "Yang Perlu Kamu Pertimbangkan!",
  hero: {
    levelBadge: "Level 1",
    title: "Universitas",
    label: "Visa Approval Rate: Prioritas",
    rating: 5,
    background: "/level-kampus/universitas-bg.svg",
  },
  description:
    "Jenis kampus dengan sebutan Universitas, yang menyediakan pendidikan akademik berbagai disiplin ilmu.",
  cards: [
    {
      id: "intensitas",
      title: "Intensitas",
      desc: "Jam kuliah rata-rata 3–4x seminggu.",
      icon: "/level-kampus/icons/intensitas.svg",
    },
    {
      id: "kurikulum",
      title: "Kurikulum",
      desc: "Pembelajaran berfokus pada implementasi teori dan riset.",
      icon: "/level-kampus/icons/kurikulum.svg",
    },
    {
      id: "universitas-top",
      title: "Universitas Top",
      desc: "Universitas top negeri dan swasta dengan reputasi terbaik.",
      icon: "/level-kampus/icons/universitas-top.svg",
    },
    {
      id: "kualifikasi",
      title: "Kualifikasi",
      desc: "Jenjang tersedia: Sarjana, Master, Doktor.",
      icon: "/level-kampus/icons/kualifikasi.svg",
    },
    {
      id: "biaya",
      title: "Biaya",
      desc: "Biaya kuliah mulai dari ±$10.000 / tahun.",
      icon: "/level-kampus/icons/biaya.svg",
    },
    {
      id: "fleksibilitas",
      title: "Fleksibilitas",
      desc: "Pilihan pembelajaran full time maupun part time.",
      icon: "/level-kampus/icons/fleksibilitas.svg",
    },
    {
      id: "komprehensif",
      title: "Komprehensif",
      desc: "Pilihan fakultas & jurusan yang lebih lengkap.",
      icon: "/level-kampus/icons/komprehensif.svg",
    },
    {
      id: "fasilitas",
      title: "Fasilitas",
      desc: "Gedung & fasilitas kampus yang lebih luas dan modern.",
      icon: "/level-kampus/icons/fasilitas.svg",
    },
    {
      id: "kolaborasi",
      title: "Kolaborasi",
      desc: "Prioritas untuk riset, project, dan networking global.",
      icon: "/level-kampus/icons/kolaborasi.svg",
    },
    {
      id: "persyaratan",
      title: "Persyaratan",
      desc: "Wajib memenuhi sertifikat bahasa & foundation tertentu.",
      icon: "/level-kampus/icons/persyaratan.svg",
    },
  ],
};

const LEVEL_KAMPUS_CONTENT_EN = {
  heading: "Campus Level",
  subtitle: "Things You Need To Consider!",
  hero: {
    levelBadge: "Level 1",
    title: "University",
    label: "Visa Approval Rate: Priority",
    rating: 5,
    background: "/level-kampus/universitas-bg.svg",
  },
  description:
    "A university-level campus that provides academic education across a wide range of disciplines.",
  cards: [
    {
      id: "intensity",
      title: "Intensity",
      desc: "Average class frequency 3–4x per week.",
      icon: "/level-kampus/icons/intensitas.svg",
    },
    {
      id: "curriculum",
      title: "Curriculum",
      desc: "Learning focuses on theory implementation and research.",
      icon: "/level-kampus/icons/kurikulum.svg",
    },
    {
      id: "top-university",
      title: "Top Universities",
      desc: "Top public and private universities with strong reputation.",
      icon: "/level-kampus/icons/universitas-top.svg",
    },
    {
      id: "qualification",
      title: "Qualification",
      desc: "Available degrees: Bachelor, Master, Doctorate.",
      icon: "/level-kampus/icons/kualifikasi.svg",
    },
    {
      id: "cost",
      title: "Cost",
      desc: "Tuition starts from around $10,000 / year.",
      icon: "/level-kampus/icons/biaya.svg",
    },
    {
      id: "flexibility",
      title: "Flexibility",
      desc: "Options for full-time or part-time study.",
      icon: "/level-kampus/icons/fleksibilitas.svg",
    },
    {
      id: "comprehensive",
      title: "Comprehensive",
      desc: "More complete faculties and majors to choose from.",
      icon: "/level-kampus/icons/komprehensif.svg",
    },
    {
      id: "facilities",
      title: "Facilities",
      desc: "Larger and more modern campus buildings & facilities.",
      icon: "/level-kampus/icons/fasilitas.svg",
    },
    {
      id: "collaboration",
      title: "Collaboration",
      desc: "Priority for research, projects, and global networking.",
      icon: "/level-kampus/icons/kolaborasi.svg",
    },
    {
      id: "requirements",
      title: "Requirements",
      desc: "Language test & foundation program may be required.",
      icon: "/level-kampus/icons/persyaratan.svg",
    },
  ],
};

/* ===== LEVEL II – POLITEKNIK (fallback) ===== */
const LEVEL_POLITEKNIK_CONTENT_ID = {
  heading: "LEVEL II – Politeknik",
  subtitle: "Fokus pada keahlian terapan dan praktik industri.",
  hero: {
    levelBadge: "Level 2",
    title: "Politeknik",
    label: "Fokus Keahlian Terapan",
    rating: 5,
    background: "/level-kampus/politeknik-bg.svg",
  },
  description:
    "Politeknik adalah institusi pendidikan tinggi vokasi yang menekankan pembelajaran praktik di laboratorium, bengkel, dan lingkungan kerja nyata. Cocok untuk kamu yang ingin cepat menguasai keahlian teknis dan siap kerja.",
  cards: [
    {
      id: "fokus-praktik",
      title: "Fokus Praktik",
      desc: "Porsi praktik di lab dan workshop lebih besar dibandingkan teori.",
      icon: "/level-kampus/icons/politeknik-praktik.svg",
    },
    {
      id: "kurikulum-vokasi",
      title: "Kurikulum Vokasi",
      desc: "Kurikulum dirancang bersama industri agar selaras dengan kebutuhan lapangan.",
      icon: "/level-kampus/icons/politeknik-kurikulum.svg",
    },
    {
      id: "dosen-praktisi",
      title: "Dosen Praktisi",
      desc: "Banyak pengajar berasal dari praktisi industri aktif.",
      icon: "/level-kampus/icons/politeknik-praktisi.svg",
    },
    {
      id: "laboratorium",
      title: "Lab & Bengkel",
      desc: "Fasilitas praktik yang menunjang pembelajaran teknis secara langsung.",
      icon: "/level-kampus/icons/politeknik-lab.svg",
    },
    {
      id: "magang-industri",
      title: "Magang Industri",
      desc: "Program magang terstruktur untuk mengasah pengalaman kerja.",
      icon: "/level-kampus/icons/politeknik-magang.svg",
    },
    {
      id: "durasi-studi",
      title: "Durasi Studi",
      desc: "Rata-rata 3 tahun untuk Diploma dengan fokus skill siap kerja.",
      icon: "/level-kampus/icons/politeknik-durasi.svg",
    },
    {
      id: "peluang-kerja",
      title: "Peluang Kerja",
      desc: "Lulusan banyak dibutuhkan di sektor industri manufaktur dan jasa.",
      icon: "/level-kampus/icons/politeknik-karir.svg",
    },
    {
      id: "upgrade-studi",
      title: "Upgrade Studi",
      desc: "Bisa melanjutkan ke jenjang Sarjana Terapan atau Universitas.",
      icon: "/level-kampus/icons/politeknik-upgrade.svg",
    },
    {
      id: "biaya-efisien",
      title: "Biaya Lebih Efisien",
      desc: "Umumnya biaya kuliah lebih terjangkau dengan hasil yang kompetitif.",
      icon: "/level-kampus/icons/politeknik-biaya.svg",
    },
    {
      id: "kelas-kecil",
      title: "Kelas Lebih Kecil",
      desc: "Interaksi dosen–mahasiswa lebih intens dan personal.",
      icon: "/level-kampus/icons/politeknik-kelas.svg",
    },
  ],
};

const LEVEL_POLITEKNIK_CONTENT_EN = {
  heading: "LEVEL II – Polytechnic",
  subtitle: "Focused on applied skills and real industry practice.",
  hero: {
    levelBadge: "Level 2",
    title: "Polytechnic",
    label: "Applied Skills Focus",
    rating: 5,
    background: "/level-kampus/politeknik-bg.svg",
  },
  description:
    "Polytechnics are vocational higher education institutions that emphasize hands-on learning in laboratories, workshops, and real work environments. Ideal for students who want to quickly master technical skills and be job-ready.",
  cards: [
    {
      id: "focus-practice",
      title: "Practice-Oriented",
      desc: "Greater portion of practical work in labs and workshops than theory.",
      icon: "/level-kampus/icons/politeknik-praktik.svg",
    },
    {
      id: "vocational-curriculum",
      title: "Vocational Curriculum",
      desc: "Curriculum is designed together with industries to match real needs.",
      icon: "/level-kampus/icons/politeknik-kurikulum.svg",
    },
    {
      id: "industry-lecturers",
      title: "Industry Lecturers",
      desc: "Many lecturers come from active industry professionals.",
      icon: "/level-kampus/icons/politeknik-praktisi.svg",
    },
    {
      id: "labs-workshops",
      title: "Labs & Workshops",
      desc: "Practical facilities that support hands-on technical learning.",
      icon: "/level-kampus/icons/politeknik-lab.svg",
    },
    {
      id: "industry-internship",
      title: "Industry Internship",
      desc: "Structured internships to strengthen real work experience.",
      icon: "/level-kampus/icons/politeknik-magang.svg",
    },
    {
      id: "study-duration",
      title: "Study Duration",
      desc: "Typically 3 years for a Diploma focused on job-ready skills.",
      icon: "/level-kampus/icons/politeknik-durasi.svg",
    },
    {
      id: "career-opportunity",
      title: "Career Opportunities",
      desc: "Graduates are highly needed in manufacturing and service sectors.",
      icon: "/level-kampus/icons/politeknik-karir.svg",
    },
    {
      id: "upgrade-study",
      title: "Further Study",
      desc: "Can continue to Applied Bachelor or University degrees.",
      icon: "/level-kampus/icons/politeknik-upgrade.svg",
    },
    {
      id: "cost-effective",
      title: "Cost-Effective",
      desc: "Tuition is generally more affordable with competitive outcomes.",
      icon: "/level-kampus/icons/politeknik-biaya.svg",
    },
    {
      id: "smaller-class",
      title: "Smaller Class Size",
      desc: "Closer and more personal interaction with lecturers.",
      icon: "/level-kampus/icons/politeknik-kelas.svg",
    },
  ],
};

/* ===== LEVEL III – COLLEGE (fallback) ===== */
const LEVEL_COLLEGE_CONTENT_ID = {
  heading: "LEVEL III – College",
  subtitle:
    "Kampus swasta (college / school) dengan fokus pembelajaran terapan dan praktis.",
  hero: {
    levelBadge: "Level 3",
    title: "College",
    label: "Visa Approval Rate: Non-Prioritas",
    rating: 3,
    background: "/level-kampus/college-bg.svg",
  },
  description:
    "Jenis kampus dengan sebutan swasta (privat) seperti College atau School, yang menyediakan pendidikan berpusat pada praktik dan keterampilan terapan.",
  cards: [
    {
      id: "intensitas",
      title: "Intensitas",
      desc: "Jam kuliah rata-rata 2–3x seminggu dengan kombinasi kelas & praktik.",
      icon: "/level-kampus/icons/college-intensitas.svg",
    },
    {
      id: "kurikulum",
      title: "Kurikulum",
      desc: "Fokus pembelajaran 70% praktik dan 30% teori.",
      icon: "/level-kampus/icons/college-kurikulum.svg",
    },
    {
      id: "swasta",
      title: "Swasta",
      desc: "College dikelola oleh lembaga swasta (privat).",
      icon: "/level-kampus/icons/college-swasta.svg",
    },
    {
      id: "profesionalisme",
      title: "Profesionalisme",
      desc: "Lebih banyak coursework, project, dan presentasi, umumnya tanpa skripsi.",
      icon: "/level-kampus/icons/college-profesionalisme.svg",
    },
    {
      id: "biaya",
      title: "Biaya",
      desc: "Biaya kuliah mulai sekitar $4.000 / semester.",
      icon: "/level-kampus/icons/college-biaya.svg",
    },
    {
      id: "profesional",
      title: "Profesional",
      desc: "Sistem pembelajaran diarahkan ke skill siap kerja di bidang tertentu.",
      icon: "/level-kampus/icons/college-profesional.svg",
    },
    {
      id: "kualifikasi",
      title: "Kualifikasi",
      desc: "Jenjang tersedia: Sertifikat, Diploma, Advanced Diploma, dan sejenisnya.",
      icon: "/level-kampus/icons/college-kualifikasi.svg",
    },
    {
      id: "persyaratan",
      title: "Persyaratan",
      desc: "Umumnya tidak mewajibkan sertifikat bahasa dengan skor tinggi.",
      icon: "/level-kampus/icons/college-persyaratan.svg",
    },
    {
      id: "fasilitas",
      title: "Fasilitas",
      desc: "Gedung & fasilitas biasanya berada di pusat kota dengan akses mudah.",
      icon: "/level-kampus/icons/college-fasilitas.svg",
    },
    {
      id: "efektivitas",
      title: "Efektivitas",
      desc: "Membantu upgrade skill dalam waktu lebih singkat dan terarah.",
      icon: "/level-kampus/icons/college-efektivitas.svg",
    },
  ],
};

const LEVEL_COLLEGE_CONTENT_EN = {
  heading: "LEVEL III – College",
  subtitle:
    "Private colleges or schools with a strong focus on applied and practical learning.",
  hero: {
    levelBadge: "Level 3",
    title: "College",
    label: "Visa Approval Rate: Non-Priority",
    rating: 3,
    background: "/level-kampus/college-bg.svg",
  },
  description:
    "A private-type campus such as a college or school that focuses on practice-based education and applied skills.",
  cards: [
    {
      id: "intensity",
      title: "Intensity",
      desc: "Classes 2–3 times per week with a mix of classroom and practical sessions.",
      icon: "/level-kampus/icons/college-intensitas.svg",
    },
    {
      id: "curriculum",
      title: "Curriculum",
      desc: "Roughly 70% practical learning and 30% theory.",
      icon: "/level-kampus/icons/college-kurikulum.svg",
    },
    {
      id: "private",
      title: "Private",
      desc: "Colleges are managed by private institutions.",
      icon: "/level-kampus/icons/college-swasta.svg",
    },
    {
      id: "professionalism",
      title: "Professionalism",
      desc: "More coursework, projects and presentations, usually without a thesis.",
      icon: "/level-kampus/icons/college-profesionalisme.svg",
    },
    {
      id: "tuition",
      title: "Tuition Fee",
      desc: "Tuition typically starts from around $4,000 per semester.",
      icon: "/level-kampus/icons/college-biaya.svg",
    },
    {
      id: "professional",
      title: "Professional",
      desc: "Learning system is designed to build job-ready skills in specific fields.",
      icon: "/level-kampus/icons/college-profesional.svg",
    },
    {
      id: "qualification",
      title: "Qualification",
      desc: "Available levels: Certificate, Diploma, Advanced Diploma, and similar.",
      icon: "/level-kampus/icons/college-kualifikasi.svg",
    },
    {
      id: "requirements",
      title: "Requirements",
      desc: "Often does not require very high language-test scores.",
      icon: "/level-kampus/icons/college-persyaratan.svg",
    },
    {
      id: "facility",
      title: "Facilities",
      desc: "Campus and facilities commonly located in city centers with easy access.",
      icon: "/level-kampus/icons/college-fasilitas.svg",
    },
    {
      id: "effectiveness",
      title: "Effectiveness",
      desc: "Helps upgrade specific skills in a shorter and more focused period.",
      icon: "/level-kampus/icons/college-efektivitas.svg",
    },
  ],
};

export default function useOverseasViewModel({ locale = "id" } = {}) {
  const lk =
    String(locale || "id")
      .slice(0, 2)
      .toLowerCase() === "en"
      ? "en"
      : "id";

  const { data, error, isLoading } = useSWR(
    `/api/overseas?locale=${lk}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(() => {
    const ID = {
      hero: {
        title: "STUDI LUAR NEGERI",
        subtitle:
          "Mulai perjalanan global Anda bersama OSS, dan jelajahi dunia penuh peluang tanpa batas.",
        illustration: "/overseas.svg",
      },

      description: `<p>Layanan Studi Luar Negeri di OSS Bali membantu peserta dalam merencanakan dan mengurus proses studi di luar negeri, mulai dari pemilihan kampus (College, Institute, TAFE, Polytechnic, & University), pengajuan aplikasi, hingga persiapan keberangkatan. Kami memberikan informasi lengkap mengenai berbagai program pendidikan internasional dan membantu peserta mempersiapkan segala kebutuhan administratif untuk mencapai tujuan studi mereka. Konsultasi Gratis yang kami sediakan berfokus pada profesionalitas untuk menyediakan kualitas informasi terbaik untuk siapapun.</p>`,

      studySection: {
        title: "Pendidikan Di Luar Negeri",
        text: "Study di luar negeri adalah langkah pertama menuju masa depan global Anda. Dapatkan pengalaman belajar di universitas internasional, kuasai bahasa, temukan budaya baru, dan buka pintu kesempatan karier tanpa batas.",
        image: "/ngopi.svg",
        pills: [
          {
            id: "p1",
            label: "Pendidikan berkualitas",
            icon: "/icons/pendidikan-berkualitas.svg",
          },
          {
            id: "p2",
            label: "Jaringan Internasional",
            icon: "/icons/jaringan-internasional.svg",
          },
          {
            id: "p3",
            label: "Pengalaman Global",
            icon: "/icons/pengalaman-global.svg",
          },
          {
            id: "p4",
            label: "Peluang Karir",
            icon: "/icons/peluang-karir.svg",
          },
        ],
      },

      levelCampus: LEVEL_KAMPUS_CONTENT_ID,
      polytechnicLevel: LEVEL_POLITEKNIK_CONTENT_ID,
      collegeLevel: LEVEL_COLLEGE_CONTENT_ID,

      /* Peluang section (ID) */
      opportunitySection: {
        heading: "Peluang Di Luar Negeri Yang Kamu Wajib Ketahui!",
        rows: [
          {
            id: "part-time",
            title: "Kuliah Sambil Kerja Paruh Waktu",
            text: "Mahasiswa yang belajar di luar negeri seperti Australia, Kanada, Selandia Baru, Inggris, dan lainnya, dapat bekerja paruh waktu selama memegang visa pelajar dan memenuhi syarat. Pendapatan rata-rata Rp 100.000–300.000 per jam, dengan batas jam kerja sesuai negara. Ketahui syarat dan ketentuannya melalui konsultasi sekarang!",
            image: "/overseas/opportunity-parttime.svg",
          },
          {
            id: "internship",
            title: "Magang Luar Negeri",
            text: "Mahasiswa yang telah menempuh beberapa semester dapat mengikuti program magang luar negeri melalui OSS Bali, seperti Coop Program (Kanada), J1 (AS), TITIP (Jepang), atau Working Holiday Visa (Australia). Program ini memberi pengalaman, sertifikat, nilai, dan penghasilan dari upah/uang saku. Info lebih lanjut bisa diperoleh melalui konsultan OSS Bali.",
            image: "/overseas/opportunity-intern.svg",
          },
        ],
      },

      ctaSection: {
        title:
          "Jadwalkan Konsultasi Gratis Dengan Ahli Kami Sekarang Juga Dan Rasakan Manfaatnya",
        buttonLabel: "Tanya Aja Dulu",
        buttonHref: "/konsultasi",
      },
    };

    const EN = {
      hero: {
        title: "STUDY ABROAD",
        subtitle:
          "Start your global journey with OSS, and explore a world of unlimited opportunities.",
        illustration: "/overseas.svg",
      },

      description: `<p>OSS Bali's Study Abroad Services assist participants in planning and managing the process of studying abroad, from choosing a campus (college, institute, TAFE, polytechnic, and university) and submitting applications to preparing for departure. We provide comprehensive information on various international education programs and help participants prepare all the administrative requirements to achieve their study goals. The free consultation we provide focuses on professionalism to deliver the best quality information to anyone.</p>`,

      studySection: {
        title: "Study Abroad Education",
        text: "Studying abroad is the first step toward your global future. Gain experience at international universities, master languages, discover new cultures, and open the door to limitless career opportunities.",
        image: "/ngopi.svg",
        pills: [
          {
            id: "p1",
            label: "High-quality education",
            icon: "/icons/pendidikan-berkualitas.svg",
          },
          {
            id: "p2",
            label: "International network",
            icon: "/icons/jaringan-internasional.svg",
          },
          {
            id: "p3",
            label: "Global experience",
            icon: "/icons/pengalaman-global.svg",
          },
          {
            id: "p4",
            label: "Career opportunities",
            icon: "/icons/peluang-karir.svg",
          },
        ],
      },

      levelCampus: LEVEL_KAMPUS_CONTENT_EN,
      polytechnicLevel: LEVEL_POLITEKNIK_CONTENT_EN,
      collegeLevel: LEVEL_COLLEGE_CONTENT_EN,

      opportunitySection: {
        heading: "Overseas Opportunities You Should Know!",
        rows: [
          {
            id: "part-time",
            title: "Study While Working Part-Time",
            text: "Students studying abroad in countries such as Australia, Canada, New Zealand, the UK, and others can work part-time as long as they hold a valid student visa and meet local requirements. Average income ranges from Rp 100,000–300,000 per hour, with work-hour limits depending on the country. Learn more about the requirements through our consultation session!",
            image: "/overseas/opportunity-parttime.svg",
          },
          {
            id: "internship",
            title: "Overseas Internship",
            text: "Students who have completed several semesters can join overseas internship programs via OSS Bali, such as Coop Program (Canada), J1 (USA), TITIP (Japan), or Working Holiday Visa (Australia). These programs provide experience, certificates, academic credits, and income. Contact our consultants for more detailed information.",
            image: "/overseas/opportunity-intern.svg",
          },
        ],
      },

      ctaSection: {
        title:
          "Book a Free Consultation With Our Experts Today and Feel the Benefits",
        buttonLabel: "Ask Us First",
        buttonHref: "/consultation",
      },
    };

    return lk === "en" ? EN : ID;
  }, [lk]);

  const content = data && !error ? data : fallback;

  return { content, isLoading, isError: Boolean(error) };
}

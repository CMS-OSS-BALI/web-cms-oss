export function useFooterUViewModel() {
  const logo = {
    src: "/images/loading.png",
    alt: "OSS Bali",
  };

  const contacts = [
    {
      icon: "location",
      text: "Hayam wuruk 66 B, lt 2 Denpasar",
    },
    {
      icon: "phone",
      text: "+62 877 0509 2020",
    },
    {
      icon: "email",
      text: "onestepsolution@gmail.com",
    },
  ];

  const navSections = [
    {
      title: "Layanan",
      links: [
        { label: "Study Abroad", href: "#" },
        { label: "Work Abroad", href: "#" },
        { label: "Language Course", href: "#" },
        { label: "Visa Consultant", href: "#" },
      ],
    },
    {
      title: "Informasi Visa",
      links: [
        { label: "Student Visa", href: "#" },
        { label: "Visitor/Tourist", href: "#" },
        { label: "Visa Extension", href: "#" },
        { label: "Scholarship", href: "#" },
      ],
    },
    {
      title: "Dukungan",
      links: [
        { label: "Career With US", href: "#" },
        { label: "Accommodation", href: "#" },
        { label: "FAQ", href: "#" },
        { label: "Review", href: "#" },
      ],
    },
  ];

  const socials = [
    { icon: "instagram", href: "#", ariaLabel: "Instagram" },
    { icon: "whatsapp", href: "#", ariaLabel: "WhatsApp" },
    { icon: "youtube", href: "#", ariaLabel: "YouTube" },
  ];

  const copyright = "\u00A9 " + new Date().getFullYear() + " OSS Bali. All Rights Reserved.";

  return {
    logo,
    contacts,
    navSections,
    socials,
    copyright,
  };
}

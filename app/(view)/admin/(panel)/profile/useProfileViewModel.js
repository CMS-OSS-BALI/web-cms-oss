"use client";

export default function useProfileViewModel({ locale = "id" } = {}) {
  const id = {
    title: "Profil",
    photo: "Foto Profil",
    name: "Nama User",
    email: "Email",
    phone: "No WhatsApp",
    uploadHint: "Max 2MB · JPG/PNG/WebP",
    save: "Simpan Perubahan",
    reset: "Reset",
    success: "Profil berhasil diperbarui.",
  };

  const en = {
    title: "Profile",
    photo: "Profile Photo",
    name: "Full Name",
    email: "Email",
    phone: "WhatsApp Number",
    uploadHint: "Max 2MB · JPG/PNG/WebP",
    save: "Save Changes",
    reset: "Reset",
    success: "Profile updated successfully.",
  };

  return {
    locale,
    T: locale === "en" ? en : id,
    api: {
      me: "/api/auth/profile",
      update: "/api/auth/profile",
    },
    tokens: {
      blue: "#0b56c9",
      text: "#0f172a",
      shellW: 1180,
      headerH: 84,
    },
    rules: {
      name: [{ required: true, message: "Nama wajib diisi" }],
      email: [
        { required: true, message: "Email wajib diisi" },
        { type: "email", message: "Email tidak valid" },
        { max: 191, message: "Maksimal 191 karakter" },
      ],
      phone: [
        { max: 32, message: "Maksimal 32 karakter" },
        { pattern: /^[0-9+()\s-]{6,32}$/, message: "Format nomor tidak valid" },
      ],
    },
  };
}

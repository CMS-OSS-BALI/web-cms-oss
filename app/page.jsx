import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);
  // Jika sudah login → ke dashboard, kalau belum → ke halaman login (tanpa "auth")
  redirect(session ? "/admin/dashboard" : "/admin/login-page");
}

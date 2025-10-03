import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminHome() {
  const session = await getServerSession(authOptions);
  // If logged in → dashboard, else → login
  redirect(session ? "/admin/dashboard" : "/admin/login-page");
}

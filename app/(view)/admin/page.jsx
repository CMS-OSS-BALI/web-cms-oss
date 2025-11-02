// app/(view)/admin/page.jsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminHome() {
  const session = await getServerSession(authOptions);
  redirect(session ? "/admin/dashboard" : "/admin/login-page");
  return null;
}

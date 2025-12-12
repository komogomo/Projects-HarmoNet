import React from "react";
import { redirect } from "next/navigation";
import { LoginPageClient } from "@/src/components/auth/LoginPageClient/LoginPageClient";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";

const LoginPage = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 既にログイン済みなら、エラークエリの有無に関わらずホームへリダイレクト
  if (user) {
    redirect("/home");
  }

  return <LoginPageClient />;
};

export default LoginPage;

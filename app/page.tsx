"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function RootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        // detectSessionInUrl=true のため、初回の getUser 時に Supabase JS が
        // URL 内のコード/トークンを検出してセッション確立を試みる。
        const { data, error } = await supabase.auth.getUser();

        if (cancelled) return;

        if (data.user && !error) {
          const next = searchParams.get("next") || "/home";
          router.replace(next);
        } else {
          router.replace("/login");
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return null;
}

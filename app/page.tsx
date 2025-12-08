import { redirect } from "next/navigation";

type RootPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function RootPage({ searchParams }: RootPageProps) {
  const codeParam = searchParams?.code;
  const nextParam = searchParams?.next;

  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;

  if (code) {
    const params = new URLSearchParams();
    params.set("code", code);
    if (next) {
      params.set("next", next);
    }
    redirect(`/auth/callback?${params.toString()}`);
  }

  redirect("/home");
}

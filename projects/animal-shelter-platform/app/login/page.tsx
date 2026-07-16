import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAdminSessionUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getAdminSessionUser();

  if (user) {
    redirect("/admin");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-shelter-cream px-6 py-10">
      <section className="w-full max-w-md">
        <p className="text-sm font-medium uppercase tracking-wide text-shelter-moss">
          Админка приюта
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Вход</h1>
        <p className="mt-3 text-sm leading-6 text-shelter-ink/70">
          Доступ к управлению животными, заявками и настройками.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}

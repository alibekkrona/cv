import Link from "next/link";
import { PublicSearchForm } from "@/components/layout/PublicSearchForm";

const links = [
  { href: "/animals", label: "Животные" },
  { href: "/needs", label: "Потребности" },
  { href: "/lost-found", label: "Потерянные и найденные" },
  { href: "/how-to-adopt", label: "Как забрать" },
  { href: "/help", label: "Помочь" },
  { href: "/contacts", label: "Контакты" }
];

export function PublicHeader() {
  return (
    <header className="relative z-40">
      <nav className="relative mx-auto grid w-full max-w-[1760px] grid-cols-[220px_minmax(420px,760px)_minmax(430px,1fr)] items-center gap-5 px-4 py-4 sm:px-6 xl:px-8">
        <Link href="/" className="justify-self-start text-lg font-semibold">
          Приют для животных
        </Link>

        <PublicSearchForm />

        <div className="col-start-3 flex flex-nowrap justify-end gap-5 text-sm font-medium text-shelter-ink/85">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

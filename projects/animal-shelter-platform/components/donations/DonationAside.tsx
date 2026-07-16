import Link from "next/link";
import { DonationButton } from "@/components/donations/DonationButton";
import { NeedCard } from "@/components/donations/NeedCard";

type DonationAsideProps = {
  animalId?: number;
  animalName?: string;
  donationsEnabled?: boolean;
  needs?: Parameters<typeof NeedCard>[0]["need"][];
};

export function DonationAside({ animalId, animalName, donationsEnabled = true, needs = [] }: DonationAsideProps) {
  if (!donationsEnabled) {
    return null;
  }

  return (
    <section className="rounded-lg bg-white p-5">
      <h2 className="text-xl font-semibold">{animalName ? `Помочь ${animalName}` : "Помочь приюту"}</h2>
      <p className="mt-2 text-sm leading-6 text-shelter-ink/70">
        Донат можно направить на общие расходы или на конкретную потребность.
      </p>
      <div className="mt-4">
        <DonationButton
          animalId={animalId}
          animalName={animalName}
          label={animalName ? "Донат животному" : "Донат приюту"}
          target={animalName ? "ANIMAL" : "SHELTER"}
          className="w-full rounded-lg bg-shelter-moss px-4 py-2 text-sm font-semibold text-white"
        />
      </div>
      {needs.length ? (
        <div className="mt-5 grid gap-3">
          <h3 className="text-sm font-semibold text-shelter-ink/75">Актуальные потребности</h3>
          {needs.slice(0, 2).map((need) => (
            <NeedCard key={need.id} need={need} compact donationsEnabled={donationsEnabled} />
          ))}
        </div>
      ) : null}
      <Link href="/needs" className="mt-4 block text-sm font-semibold text-shelter-moss">
        Все потребности
      </Link>
    </section>
  );
}

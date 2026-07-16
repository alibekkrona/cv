import { NextResponse } from "next/server";
import { listAvailableAnimals } from "@/lib/services/animals.service";

export async function GET() {
  const animals = await listAvailableAnimals({});

  return NextResponse.json({ animals });
}

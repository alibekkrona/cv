import { NextResponse } from "next/server";
import { getPublicAnimalSearchSuggestions } from "@/lib/services/animals.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const suggestions = await getPublicAnimalSearchSuggestions(query);

  return NextResponse.json({ suggestions });
}

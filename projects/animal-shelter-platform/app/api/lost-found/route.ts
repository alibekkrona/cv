import { NextResponse } from "next/server";
import { createLostFoundReport } from "@/lib/services/lost-found.service";
import { lostFoundReportSchema } from "@/lib/validation/lost-found.schema";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = lostFoundReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const report = await createLostFoundReport(parsed.data, { defaultStatus: "SUBMITTED" });

  return NextResponse.json({ report }, { status: 201 });
}

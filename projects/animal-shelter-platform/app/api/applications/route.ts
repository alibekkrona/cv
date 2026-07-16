import { NextResponse } from "next/server";
import { createApplication } from "@/lib/services/applications.service";
import { adoptionApplicationSchema } from "@/lib/validation/application.schema";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = adoptionApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const application = await createApplication(parsed.data);

  return NextResponse.json({ application }, { status: 201 });
}

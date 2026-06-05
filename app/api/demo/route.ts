import { NextResponse } from "next/server";
import { DATOS_EJEMPLO } from "@/lib/sample";

export async function GET() {
  return NextResponse.json({ registros: DATOS_EJEMPLO, demo: true });
}

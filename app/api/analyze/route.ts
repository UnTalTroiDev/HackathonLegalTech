import { NextResponse } from "next/server";
import { analizarLote, hayCredenciales, type PdfEntrada } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Topes defensivos (evitan OOM y abuso). */
const MAX_DOCS = 200;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB por archivo

export async function POST(req: Request) {
  if (!hayCredenciales()) {
    return NextResponse.json(
      {
        error:
          "No hay credenciales configuradas. Define CEREBRAS_API_KEY y/o ANTHROPIC_API_KEY en .env.local, o usa el modo demo.",
      },
      { status: 422 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data." }, { status: 400 });
  }

  const archivos = form.getAll("files").filter((f): f is File => f instanceof File);
  if (archivos.length === 0) {
    return NextResponse.json({ error: "No se recibieron archivos PDF." }, { status: 400 });
  }

  const entradas: PdfEntrada[] = [];
  const avisos: string[] = [];

  for (const f of archivos) {
    if (entradas.length >= MAX_DOCS) {
      avisos.push(`Se omitieron documentos: máximo ${MAX_DOCS} por lote.`);
      break;
    }
    const esPdf =
      f.type === "application/pdf" ||
      (!f.type && f.name.toLowerCase().endsWith(".pdf")) ||
      f.name.toLowerCase().endsWith(".pdf");
    if (!esPdf) {
      avisos.push(`«${f.name}» ignorado (no es PDF).`);
      continue;
    }
    if (f.size > MAX_FILE_BYTES) {
      avisos.push(`«${f.name}» ignorado (supera 20 MB).`);
      continue;
    }
    const buf = Buffer.from(await f.arrayBuffer());
    entradas.push({ nombre_archivo: f.name, datos: buf });
  }

  if (entradas.length === 0) {
    return NextResponse.json(
      { error: avisos[0] ?? "Ningún archivo es un PDF válido." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const linea = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(linea({ type: "start", total: entradas.length, avisos }));
      try {
        await analizarLote(entradas, {
          onResultado: (registro) => controller.enqueue(linea({ type: "result", registro })),
        });
        controller.enqueue(linea({ type: "done" }));
      } catch (err) {
        controller.enqueue(
          linea({ type: "error", error: err instanceof Error ? err.message : String(err) }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

import { construirInforme, construirOficio } from "@/lib/pdf";
import type { RegistroDocumento } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { tipo?: string; registros?: RegistroDocumento[]; registro?: RegistroDocumento };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido." }), { status: 400 });
  }

  try {
    let bytes: Uint8Array;
    let nombre: string;

    if (body.tipo === "informe") {
      if (!body.registros?.length) {
        return new Response(JSON.stringify({ error: "Sin registros." }), { status: 400 });
      }
      bytes = await construirInforme(body.registros);
      nombre = "informe-due-diligence.pdf";
    } else if (body.tipo === "oficio") {
      if (!body.registro) {
        return new Response(JSON.stringify({ error: "Sin registro." }), { status: 400 });
      }
      bytes = await construirOficio(body.registro);
      const base = body.registro.titular.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      nombre = `oficio-autorizacion-${base}.pdf`;
    } else {
      return new Response(JSON.stringify({ error: "tipo debe ser 'informe' u 'oficio'." }), {
        status: 400,
      });
    }

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500 },
    );
  }
}

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { accionRecomendada, type RegistroDocumento } from "./types";

const INK = rgb(0.11, 0.1, 0.086);
const SOFT = rgb(0.36, 0.33, 0.29);
const OXBLOOD = rgb(0.48, 0.18, 0.16);
const RULE = rgb(0.85, 0.82, 0.76);

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 54;
const ANCHO = A4.w - MARGIN * 2;

/** Las fuentes estándar usan WinAnsi: hay que reemplazar caracteres fuera de Latin-1. */
function ascii(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/[•·]/g, "-")
    .replace(/✓/g, "OK")
    .replace(/⚠️?/g, "!")
    .replace(/[^\x09\x0a\x0d\x20-\xff]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const parrafo of ascii(text).split("\n")) {
    const palabras = parrafo.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of palabras) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    lines.push(cur);
  }
  return lines;
}

const ESTADO_TXT: Record<string, string> = {
  presente: "PRESENTE",
  ambigua: "AMBIGUA",
  ausente: "AUSENTE",
};

/** Cursor de escritura que añade páginas automáticamente. */
class Lienzo {
  doc!: PDFDocument;
  page!: PDFPage;
  y = 0;
  font!: PDFFont;
  bold!: PDFFont;

  static async crear() {
    const l = new Lienzo();
    l.doc = await PDFDocument.create();
    l.font = await l.doc.embedFont(StandardFonts.Helvetica);
    l.bold = await l.doc.embedFont(StandardFonts.HelveticaBold);
    l.nuevaPagina();
    return l;
  }

  nuevaPagina() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.y = A4.h - MARGIN;
  }

  espacio(n: number) {
    this.y -= n;
    if (this.y < MARGIN + 40) this.nuevaPagina();
  }

  texto(
    s: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    for (const linea of wrap(s, font, size, ANCHO - ((opts.x ?? MARGIN) - MARGIN))) {
      if (this.y < MARGIN + 24) this.nuevaPagina();
      this.page.drawText(linea, {
        x: opts.x ?? MARGIN,
        y: this.y,
        size,
        font,
        color: opts.color ?? INK,
      });
      this.y -= size + 4;
    }
  }

  regla() {
    this.espacio(6);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4.w - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
    this.espacio(10);
  }
}

/** Informe ejecutivo de toda la cartera revisada. */
export async function construirInforme(registros: RegistroDocumento[]): Promise<Uint8Array> {
  const l = await Lienzo.crear();

  const total = registros.length;
  const sin = registros.filter((r) => r.autorizacion_centrales_riesgo === "ausente").length;
  const amb = registros.filter(
    (r) =>
      r.autorizacion_centrales_riesgo === "ambigua" ||
      r.autorizacion_tratamiento_datos === "ambigua",
  ).length;
  const conf = registros.filter((r) => r.prioridad === 2).length;
  const rev = registros.filter((r) => r.requiere_revision_humana).length;
  const pctConf = total ? Math.round((conf / total) * 100) : 0;

  l.texto("Informe de Debida Diligencia", { size: 20, bold: true });
  l.texto("Protección de datos y reporte a centrales de riesgo", { size: 11, color: SOFT });
  l.texto(`Generado: ${new Date().toLocaleString("es-CO")}`, { size: 9, color: SOFT });
  l.regla();

  l.texto("Resumen", { size: 12, bold: true, color: OXBLOOD });
  l.espacio(14);
  l.texto(`Documentos revisados: ${total}`, { size: 10 });
  l.texto(`Sin autorizacion para centrales de riesgo: ${sin}`, { size: 10 });
  l.texto(`Ambiguos: ${amb}`, { size: 10 });
  l.texto(`Conformes: ${conf}  (${pctConf}% de la cartera)`, { size: 10 });
  l.texto(`Requieren validacion de un abogado: ${rev}`, { size: 10 });
  l.espacio(8);
  l.texto(
    "Marco aplicado: Ley 1266 de 2008, Ley 2157 de 2021, Ley 1581 de 2012 y Decreto 1377 de 2013.",
    { size: 9, color: SOFT },
  );
  l.regla();

  l.texto("Detalle por documento (prioridad: ausente, ambiguo, conforme)", {
    size: 12,
    bold: true,
    color: OXBLOOD,
  });
  l.espacio(14);

  const ordenados = [...registros].sort(
    (a, b) => a.prioridad - b.prioridad || a.confianza - b.confianza,
  );

  for (const r of ordenados) {
    l.espacio(6);
    l.texto(`${r.titular}${r.documento_identidad ? `  (${r.documento_identidad})` : ""}`, {
      size: 11,
      bold: true,
    });
    l.texto(`Archivo: ${r.nombre_archivo}  ·  ${r.tipo_documento}`, { size: 8.5, color: SOFT });
    l.texto(
      `Centrales de riesgo: ${ESTADO_TXT[r.autorizacion_centrales_riesgo]}   ` +
        `Tratamiento: ${ESTADO_TXT[r.autorizacion_tratamiento_datos]}   ` +
        `Confianza: ${Math.round(r.confianza * 100)}%${r.pagina ? `   pag. ${r.pagina}` : ""}`,
      { size: 9 },
    );
    l.texto(
      `Comunicacion previa al reporte negativo (Ley 2157/2021): ${ESTADO_TXT[r.comunicacion_previa_reporte]}`,
      { size: 9 },
    );
    if (r.cita_textual) l.texto(`Cita: "${r.cita_textual}"`, { size: 9, color: SOFT });
    l.texto(`Accion: ${accionRecomendada(r.autorizacion_centrales_riesgo)}`, { size: 9 });
    l.espacio(8);
  }

  l.regla();
  l.texto(
    "Este informe es asistido por IA y no sustituye el criterio juridico. Todo documento ambiguo o " +
      "sin autorizacion debe ser validado por un abogado antes de cualquier reporte a centrales de riesgo.",
    { size: 8, color: SOFT },
  );

  return l.doc.save();
}

/** Oficio de solicitud de autorización para un titular concreto. */
export async function construirOficio(r: RegistroDocumento): Promise<Uint8Array> {
  const l = await Lienzo.crear();
  const hoy = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  l.texto("SOLICITUD DE AUTORIZACION PARA EL TRATAMIENTO DE DATOS PERSONALES", {
    size: 12,
    bold: true,
  });
  l.espacio(18);
  l.texto(`Ciudad y fecha: ____________, ${hoy}`, { size: 10, color: SOFT });
  l.espacio(18);
  l.texto(`Senor(a): ${r.titular}`, { size: 10 });
  if (r.documento_identidad) l.texto(`Identificacion: ${r.documento_identidad}`, { size: 10 });
  l.espacio(8);
  l.texto("Asunto: Autorizacion para el reporte a centrales de riesgo (Ley 1266 de 2008).", {
    size: 10,
    bold: true,
  });
  l.regla();

  l.texto(
    "Respetado(a) senor(a):",
    { size: 10 },
  );
  l.espacio(10);
  l.texto(
    "En el marco de la relacion de credito existente, y en cumplimiento de la Ley 1581 de 2012, " +
      "el Decreto 1377 de 2013 y la Ley 1266 de 2008, le solicitamos otorgar su autorizacion previa, " +
      "expresa e informada para el tratamiento de sus datos personales y, en particular, para consultar, " +
      "reportar y actualizar su comportamiento crediticio -incluida la informacion positiva y negativa- " +
      "ante los operadores de informacion financiera (centrales de riesgo).",
    { size: 10 },
  );
  l.espacio(10);
  l.texto(
    "La revision del documento " +
      `"${r.nombre_archivo}" arrojo que la autorizacion para reportes a centrales de riesgo se encuentra ` +
      `en estado: ${ESTADO_TXT[r.autorizacion_centrales_riesgo]}. Por ello, y hasta contar con su ` +
      "autorizacion firmada, no se realizara ningun reporte.",
    { size: 10 },
  );
  l.espacio(10);
  l.texto(
    "Conforme a la Ley 2157 de 2021, antes de cualquier reporte de informacion negativa le " +
      "comunicaremos tal hecho con una antelacion minima de veinte (20) dias calendario, y dicha " +
      "informacion permanecera unicamente por los plazos legales de permanencia.",
    { size: 10 },
  );
  l.espacio(10);
  l.texto(
    "Usted puede conocer, actualizar, rectificar y revocar esta autorizacion en cualquier momento, " +
      "conforme a sus derechos como titular (habeas data).",
    { size: 10 },
  );
  l.espacio(26);
  l.texto("Autorizo: ____ SI    ____ NO", { size: 10, bold: true });
  l.espacio(28);
  l.texto("____________________________", { size: 10 });
  l.texto(`Firma del titular - ${r.titular}`, { size: 9, color: SOFT });
  if (r.documento_identidad) l.texto(`C.C. ${r.documento_identidad.replace(/\D/g, "")}`, { size: 9, color: SOFT });

  l.espacio(24);
  l.texto(
    "Documento generado automaticamente como borrador; revise y ajuste antes de su uso.",
    { size: 8, color: SOFT },
  );

  return l.doc.save();
}

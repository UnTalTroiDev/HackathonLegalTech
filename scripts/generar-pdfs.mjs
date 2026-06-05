/**
 * Genera PDFs de prueba en public/samples/ para demostrar el enrutado híbrido en vivo:
 *  - 01 con capa de texto que autoriza centrales  → ruta Cerebras (texto)
 *  - 02 con texto pero ambiguo (sin centrales)     → ruta Cerebras (texto)
 *  - 03 escaneado (imagen, sin OCR) que autoriza   → ruta Claude (visión)
 *  - 04 híbrido (carátula texto + cláusula imagen)  → ruta Claude (visión, híbrido)
 *
 * Uso: npm run samples
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const OUT = join(process.cwd(), "public", "samples");

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** PDF con capa de texto real (extraíble). */
async function pdfTexto(titulo, parrafos) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const M = 56;
  const ancho = 595.28 - M * 2;
  let y = 780;

  page.drawText(titulo, { x: M, y, size: 16, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 34;

  const wrap = (t, size) => {
    const out = [];
    for (const par of t.split("\n")) {
      const words = par.split(/\s+/);
      let cur = "";
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) > ancho && cur) {
          out.push(cur);
          cur = w;
        } else cur = test;
      }
      out.push(cur);
      out.push("");
    }
    return out;
  };

  for (const p of parrafos) {
    for (const linea of wrap(p, 11)) {
      if (y < 70) {
        y = 780;
        doc.addPage([595.28, 841.89]);
      }
      page.drawText(linea, { x: M, y, size: 11, font, color: rgb(0.13, 0.12, 0.1) });
      y -= 17;
    }
  }
  return doc.save();
}

/** Página "escaneada": texto rasterizado a imagen (sin capa de texto). */
function svgPagina(titulo, lineas) {
  const W = 1000;
  const H = 1414;
  const cuerpo = lineas
    .map((t, i) => `<text x="90" y="${210 + i * 40}" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="#222">${esc(t)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="#f4f1e9"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#ccc" stroke-width="2"/>
    <text x="90" y="120" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#1a1a1a">${esc(titulo)}</text>
    ${cuerpo}
  </svg>`;
}

async function pdfImagen(paginas) {
  const doc = await PDFDocument.create();
  for (const { titulo, lineas } of paginas) {
    const png = await sharp(Buffer.from(svgPagina(titulo, lineas))).png().toBuffer();
    const img = await doc.embedPng(png);
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  return doc.save();
}

/** PDF híbrido: una página de texto + una página imagen. */
async function pdfHibrido(caratula, paginaImagen) {
  const base = await PDFDocument.load(await pdfTexto(caratula.titulo, caratula.parrafos));
  const img = await PDFDocument.load(await pdfImagen([paginaImagen]));
  const [pImg] = await base.copyPages(img, [0]);
  base.addPage(pImg);
  return base.save();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  await writeFile(
    join(OUT, "01_autoriza_centrales.pdf"),
    await pdfTexto("PAGARÉ Y CARTA DE INSTRUCCIONES", [
      "Deudor: María Fernanda Gómez Rincón. C.C. 52.345.678. Fecha: 12 de marzo de 2024.",
      "El deudor autoriza de manera expresa e irrevocable a EL ACREEDOR para consultar, reportar y actualizar ante las centrales de riesgo (Datacrédito, TransUnion) su comportamiento crediticio, incluyendo la información positiva y negativa, en los términos de la Ley 1266 de 2008.",
      "Asimismo, autoriza el tratamiento de sus datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.",
      "EL ACREEDOR comunicará al deudor, con una antelación mínima de veinte (20) días, cualquier reporte de información negativa, y dicha información permanecerá únicamente por los plazos legales, conforme a la Ley 2157 de 2021.",
    ]),
  );

  await writeFile(
    join(OUT, "02_ambiguo_tratamiento.pdf"),
    await pdfTexto("CONTRATO DE MUTUO", [
      "Cliente: Jorge Iván Castro Peña. C.C. 79.112.004. Fecha: 28 de noviembre de 2023.",
      "El cliente autoriza el tratamiento de sus datos personales para las finalidades propias de la relación comercial y el cumplimiento del presente contrato.",
      "Las partes acuerdan las condiciones de plazo, interés y forma de pago señaladas en las cláusulas siguientes.",
    ]),
  );

  await writeFile(
    join(OUT, "03_escaneado_sin_ocr.pdf"),
    await pdfImagen([
      {
        titulo: "PAGARÉ (DOCUMENTO ESCANEADO)",
        lineas: [
          "Deudor: Luz Adriana Mejía Soto. C.C. 43.998.221.",
          "Fecha: 5 de julio de 2022.",
          "",
          "El deudor autoriza de forma expresa el reporte y la consulta",
          "de su comportamiento de pago, incluida la cartera vencida,",
          "ante las centrales de información financiera, conforme a la",
          "Ley 1266 de 2008.",
        ],
      },
    ]),
  );

  await writeFile(
    join(OUT, "04_hibrido.pdf"),
    await pdfHibrido(
      {
        titulo: "CONTRATO DE CRÉDITO DE CONSUMO (CARÁTULA)",
        parrafos: [
          "Titular: Ricardo Andrés López Vargas. C.C. 80.456.123. Fecha: 19 de enero de 2025.",
          "La presente carátula resume las condiciones generales del crédito. Las autorizaciones de tratamiento de datos constan en el anexo escaneado de la página siguiente.",
        ],
      },
      {
        titulo: "ANEXO DE AUTORIZACIÓN (ESCANEADO)",
        lineas: [
          "Autorizo a la entidad para reportar mi información crediticia,",
          "positiva y negativa, a los operadores de información financiera",
          "(centrales de riesgo), en los términos de la Ley 1266 de 2008.",
        ],
      },
    ),
  );

  console.log("PDFs de prueba generados en public/samples/:");
  console.log("  01_autoriza_centrales.pdf  (texto · presente)");
  console.log("  02_ambiguo_tratamiento.pdf (texto · ambiguo)");
  console.log("  03_escaneado_sin_ocr.pdf   (imagen · visión)");
  console.log("  04_hibrido.pdf             (texto + imagen · híbrido)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

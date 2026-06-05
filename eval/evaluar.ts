/**
 * Harness de evaluación: mide la exactitud del clasificador contra un set de
 * documentos etiquetados por un abogado. Es el rigor que exige una tarea de
 * compliance: medir precisión/recall ANTES de confiar a escala.
 *
 * Uso:  npm run eval            (usa eval/casos.json)
 *       npm run eval -- otro.json
 *
 * Requiere CEREBRAS_API_KEY y/o ANTHROPIC_API_KEY (el script intenta cargar .env.local).
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analizarDocumento } from "../lib/analyze";
import { EstadoAutorizacion } from "../lib/types";

const DIR = dirname(fileURLToPath(import.meta.url));
const ESTADOS = ["presente", "ambigua", "ausente"] as const;

interface Caso {
  archivo: string;
  esperado_centrales: (typeof ESTADOS)[number];
  esperado_tratamiento?: (typeof ESTADOS)[number];
}

try {
  process.loadEnvFile(join(process.cwd(), ".env.local"));
} catch {
  /* sin .env.local: se usan las variables del entorno */
}

function matrizVacia() {
  const m: Record<string, Record<string, number>> = {};
  for (const e of ESTADOS) {
    m[e] = {};
    for (const p of ESTADOS) m[e][p] = 0;
  }
  return m;
}

async function main() {
  const archivoCasos = process.argv[2] ?? join(DIR, "casos.json");
  const casos: Caso[] = JSON.parse(await readFile(archivoCasos, "utf8"));
  if (!casos.length) {
    console.error("No hay casos en", archivoCasos);
    process.exit(1);
  }

  console.log(`\nEvaluando ${casos.length} documentos etiquetados…\n`);

  const matriz = matrizVacia(); // matriz[esperado][predicho] para centrales_riesgo
  let aciertos = 0;
  let falsosPositivosPeligrosos = 0; // esperado=ausente, predicho=presente → reporte ilegal
  const fallos: string[] = [];

  for (const caso of casos) {
    const datos = await readFile(join(DIR, "pdfs", caso.archivo));
    const r = await analizarDocumento({
      nombre_archivo: caso.archivo,
      datos: Buffer.from(datos),
    });

    const esperado = EstadoAutorizacion.parse(caso.esperado_centrales);
    const predicho = r.autorizacion_centrales_riesgo;
    matriz[esperado][predicho]++;

    if (esperado === predicho) aciertos++;
    else fallos.push(
      `  ✗ ${caso.archivo}: esperado «${esperado}», predicho «${predicho}» (conf ${Math.round(
        r.confianza * 100,
      )}%, ${r.ruta})`,
    );

    if (esperado === "ausente" && predicho === "presente") falsosPositivosPeligrosos++;

    const marca = esperado === predicho ? "✓" : "✗";
    console.log(`  ${marca} ${caso.archivo.padEnd(36)} ${esperado} → ${predicho}`);
  }

  // Precisión/recall por clase (centrales_riesgo)
  console.log("\nMatriz de confusión (centrales de riesgo) — filas=esperado, col=predicho:");
  console.log("            " + ESTADOS.map((e) => e.padStart(10)).join(""));
  for (const e of ESTADOS) {
    console.log("  " + e.padEnd(10) + ESTADOS.map((p) => String(matriz[e][p]).padStart(10)).join(""));
  }

  console.log("\nPrecisión / recall por clase:");
  for (const c of ESTADOS) {
    const tp = matriz[c][c];
    const fp = ESTADOS.reduce((s, e) => s + (e !== c ? matriz[e][c] : 0), 0);
    const fn = ESTADOS.reduce((s, p) => s + (p !== c ? matriz[c][p] : 0), 0);
    const prec = tp + fp ? tp / (tp + fp) : 1;
    const rec = tp + fn ? tp / (tp + fn) : 1;
    console.log(
      `  ${c.padEnd(10)} precisión ${(prec * 100).toFixed(0)}%   recall ${(rec * 100).toFixed(0)}%`,
    );
  }

  const exactitud = (aciertos / casos.length) * 100;
  console.log(`\nExactitud global: ${exactitud.toFixed(1)}% (${aciertos}/${casos.length})`);
  console.log(
    `Falsos positivos PELIGROSOS (ausente clasificado como presente): ${falsosPositivosPeligrosos}` +
      (falsosPositivosPeligrosos > 0 ? "  ⚠️  riesgo de reporte ilegal" : "  ✓"),
  );

  if (fallos.length) {
    console.log("\nDesaciertos:");
    fallos.forEach((f) => console.log(f));
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

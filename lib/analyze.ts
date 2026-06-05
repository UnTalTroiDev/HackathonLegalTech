import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { cerebras } from "@ai-sdk/cerebras";
import { extractText, getDocumentProxy } from "unpdf";
import {
  ResultadoSchema,
  clasificarRiesgo,
  type Resultado,
  type RegistroDocumento,
} from "./types";

/** Modelo de texto barato/rápido (Cerebras) para PDFs con capa de texto. */
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL ?? "gpt-oss-120b";
/** Modelo de visión (Claude) para escaneados/híbridos y re-verificación. */
const ANTHROPIC_MODEL = process.env.MODEL ?? "claude-sonnet-4-6";
/** Si Cerebras clasifica con confianza < este umbral, Claude re-verifica. */
const UMBRAL_REVERIFICACION = 0.7;
/** Caracteres no-espacio mínimos (todo el doc) para considerar que trae texto. */
const MIN_TEXTO = 220;
/** Caracteres no-espacio mínimos por página para contarla como "con texto". */
const MIN_TEXTO_PAGINA = 40;
/** Si esta fracción de páginas o más viene sin texto, se trata como híbrido → visión. */
const FRACCION_VISION = 0.34;
/** Tope de texto enviado a Cerebras (evita exceder su contexto). */
const MAX_TEXT_CHARS = 60_000;

const tieneCerebras = () => Boolean(process.env.CEREBRAS_API_KEY);
const tieneAnthropic = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY);

export function hayCredenciales(): boolean {
  return tieneCerebras() || tieneAnthropic();
}

function modeloAnthropic() {
  if (process.env.AI_GATEWAY_API_KEY) return `anthropic/${ANTHROPIC_MODEL}`;
  return anthropic(ANTHROPIC_MODEL);
}

/** Instrucciones legales estáticas, compartidas por ambos modelos. */
const SYSTEM_PROMPT = `Eres un abogado colombiano experto en protección de datos personales (Habeas Data),
realizando una debida diligencia (due diligence) para una empresa de colocación de crédito.

MARCO NORMATIVO QUE DEBES APLICAR:
- Ley 1266 de 2008: Habeas Data financiero. Rige la administración de datos de contenido
  crediticio y los REPORTES a centrales de riesgo (Datacrédito, TransUnion/Cifin). Exige
  autorización previa y expresa del titular para reportar y consultar su comportamiento de pago,
  incluyendo la información NEGATIVA (mora, incumplimiento).
- Ley 2157 de 2021 (modificó la Ley 1266): refuerza la protección del titular. Obliga a COMUNICAR
  PREVIAMENTE al titular —al menos 20 días antes— la intención de reportar información negativa, y
  fija reglas de PERMANENCIA/CADUCIDAD del dato negativo (debe retirarse pasado el plazo legal y,
  si la obligación se paga, en un término más breve).
- Ley 1581 de 2012: régimen general de protección de datos. Exige autorización previa, expresa
  e informada para el tratamiento de datos personales.
- Decreto 1377 de 2013: reglamenta la forma y prueba de la autorización del titular.

TAREA:
Analiza el documento (contrato, pagaré, carta de instrucciones, etc.) y determina con rigor:
1. Si existe autorización GENERAL de tratamiento de datos personales (Ley 1581).
2. LO MÁS IMPORTANTE: si existe autorización EXPRESA para reportar y consultar el comportamiento
   crediticio del titular —incluyendo reportes NEGATIVOS— ante centrales de riesgo (Ley 1266).
3. Si el documento informa o contempla la COMUNICACIÓN PREVIA al reporte negativo y las reglas de
   permanencia del dato negativo (Ley 2157 de 2021).

REGLAS DE CLASIFICACIÓN:
- "presente": la cláusula es clara, expresa y suficiente. Para centrales de riesgo, debe autorizar
  explícitamente el reporte/consulta a operadores de información financiera.
- "ambigua": existe una mención, pero es genérica, no menciona reportes a centrales de riesgo,
  o no cubre el dato negativo. Ante la duda razonable, clasifica como "ambigua", NUNCA como "presente".
- "ausente": no hay autorización alguna.

EXIGENCIAS:
- Cita SIEMPRE la cláusula textual exacta que sustenta tu decisión sobre centrales de riesgo,
  con su número de página.
- Si el documento es ilegible o no contiene la autorización, dilo claramente (ausente).
- Sé conservador: un falso "presente" puede causar un reporte ilegal y una sanción de la SIC.
- Responde únicamente con la estructura solicitada, en español.`;

const USER_INSTRUCTION =
  "Analiza el siguiente documento y completa la ficha de due diligence de protección de datos.";

export interface PdfEntrada {
  nombre_archivo: string;
  datos: Buffer;
}

type ModoExtraccion = "texto" | "escaneado" | "hibrido";
interface Extraccion {
  texto: string;
  modo: ModoExtraccion;
  totalPaginas: number;
  paginasSinTexto: number;
}

/**
 * Extrae texto por página, conserva citas con marcadores [Página N] y decide el modo:
 * - "texto": todas (o casi todas) las páginas tienen texto → Cerebras.
 * - "escaneado": sin texto útil → Claude visión.
 * - "hibrido": parte texto, parte imagen → Claude visión (no perder lo escaneado).
 */
async function extraerTexto(datos: Buffer): Promise<Extraccion> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(datos));
    const { text } = await extractText(pdf, { mergePages: false });
    const paginas = Array.isArray(text) ? text : [text];
    const total = paginas.length || 1;

    let sinTexto = 0;
    for (const p of paginas) {
      if ((p ?? "").replace(/\s/g, "").length < MIN_TEXTO_PAGINA) sinTexto++;
    }

    const texto = paginas.map((t, i) => `[Página ${i + 1}]\n${t ?? ""}`).join("\n\n");
    const totalSinEspacios = texto.replace(/\s/g, "").length;

    let modo: ModoExtraccion;
    if (totalSinEspacios < MIN_TEXTO) modo = "escaneado";
    else if (sinTexto >= 1 && sinTexto / total >= FRACCION_VISION) modo = "hibrido";
    else modo = "texto";

    return { texto: texto.slice(0, MAX_TEXT_CHARS), modo, totalPaginas: total, paginasSinTexto: sinTexto };
  } catch {
    return { texto: "", modo: "escaneado", totalPaginas: 0, paginasSinTexto: 0 };
  }
}

/** Clasificación con Cerebras (solo texto, barato y rápido). */
async function clasificarConCerebras(texto: string): Promise<Resultado> {
  const { object } = await generateObject({
    model: cerebras(CEREBRAS_MODEL),
    schema: ResultadoSchema,
    system: SYSTEM_PROMPT,
    prompt: `${USER_INSTRUCTION}\n\nTEXTO DEL DOCUMENTO:\n"""\n${texto}\n"""`,
  });
  return object;
}

/** Clasificación con Claude usando visión nativa de PDF (lee texto y escaneados). */
async function clasificarConClaude(entrada: PdfEntrada): Promise<Resultado> {
  const { object } = await generateObject({
    model: modeloAnthropic(),
    schema: ResultadoSchema,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        // Prompt caching: el prompt legal es idéntico para todos los documentos.
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      {
        role: "user",
        content: [
          { type: "text", text: USER_INSTRUCTION },
          {
            type: "file",
            mediaType: "application/pdf",
            data: entrada.datos,
            filename: entrada.nombre_archivo,
          },
        ],
      },
    ],
  });
  return object;
}

/** Procesa un único PDF aplicando el enrutado híbrido y los fallbacks. */
export async function analizarDocumento(entrada: PdfEntrada): Promise<RegistroDocumento> {
  const hash = createHash("sha256").update(entrada.datos).digest("hex");
  const base = {
    id: randomUUID(),
    nombre_archivo: entrada.nombre_archivo,
    hash_sha256: hash,
    procesado_en: new Date().toISOString(),
  };

  try {
    const ext = await extraerTexto(entrada.datos);
    const necesitaVision = ext.modo !== "texto";

    let object: Resultado;
    let modelo: string;
    let ruta: string;
    let reverificado = false;

    if (!necesitaVision && tieneCerebras()) {
      // PDF con capa de texto → Cerebras (barato/rápido)
      try {
        object = await clasificarConCerebras(ext.texto);
        modelo = CEREBRAS_MODEL;
        ruta = "cerebras (texto)";
      } catch (errCerebras) {
        // Fallback: si Cerebras falla (p. ej. JSON inválido) y hay Claude, lo intentamos con visión.
        if (!tieneAnthropic()) throw errCerebras;
        object = await clasificarConClaude(entrada);
        modelo = ANTHROPIC_MODEL;
        ruta = "cerebras⚠→claude (fallback)";
        reverificado = true;
      }

      // Re-verificación con Claude visión si Cerebras quedó con baja confianza
      if (!reverificado && object.confianza < UMBRAL_REVERIFICACION && tieneAnthropic()) {
        object = await clasificarConClaude(entrada);
        modelo = ANTHROPIC_MODEL;
        ruta = "cerebras→claude (reverificado)";
        reverificado = true;
      }
    } else if (tieneAnthropic()) {
      // Escaneado/híbrido sin texto fiable, o sin Cerebras → Claude visión
      object = await clasificarConClaude(entrada);
      modelo = ANTHROPIC_MODEL;
      ruta =
        ext.modo === "escaneado"
          ? "claude (visión, escaneado)"
          : ext.modo === "hibrido"
            ? "claude (visión, híbrido)"
            : "claude (texto)";
    } else {
      throw new Error(
        "Documento escaneado/híbrido sin credenciales de Anthropic (visión). Configura ANTHROPIC_API_KEY para procesarlo.",
      );
    }

    const riesgo = clasificarRiesgo(object);
    return { ...base, modelo, ruta, reverificado, ...object, ...riesgo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Caso esperado: el documento necesita la ruta de visión (Anthropic) y no está disponible.
    const requiereVision = /credenciales de Anthropic|credit balance|too low|insufficient|quota/i.test(
      msg,
    );
    const fundamento = requiereVision
      ? "Documento escaneado/híbrido: requiere la ruta de visión (Anthropic) o revisión manual de un abogado."
      : "No se pudo clasificar automáticamente; marcado para revisión manual.";
    return {
      ...base,
      modelo: "n/a",
      ruta: "revisión manual",
      titular: "No identificado",
      documento_identidad: null,
      fecha_contrato: null,
      tipo_documento: "Documento escaneado / no procesado",
      autorizacion_tratamiento_datos: "ambigua",
      autorizacion_centrales_riesgo: "ambigua",
      comunicacion_previa_reporte: "ambigua",
      cita_textual: null,
      pagina: null,
      fundamento,
      confianza: 0,
      prioridad: 1,
      requiere_revision_humana: true,
      error: msg,
    };
  }
}

export interface OpcionesLote {
  concurrencia?: number;
  /** Se invoca cada vez que termina un documento (para streaming de progreso). */
  onResultado?: (registro: RegistroDocumento, indice: number) => void;
}

/** Procesa varios PDFs con concurrencia limitada (pool), emitiendo cada resultado. */
export async function analizarLote(
  entradas: PdfEntrada[],
  opciones: OpcionesLote = {},
): Promise<RegistroDocumento[]> {
  const { concurrencia = 4, onResultado } = opciones;
  const resultados: RegistroDocumento[] = new Array(entradas.length);
  let cursor = 0;

  async function worker() {
    while (cursor < entradas.length) {
      const i = cursor++;
      const r = await analizarDocumento(entradas[i]);
      resultados[i] = r;
      onResultado?.(r, i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrencia, entradas.length) }, worker),
  );
  return resultados;
}

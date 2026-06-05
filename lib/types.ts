import { z } from "zod";

/**
 * Estado de una autorización dentro de un contrato.
 * - presente: la cláusula existe de forma clara y suficiente.
 * - ambigua: hay una mención, pero es genérica, parcial o no concluyente.
 * - ausente: no se encontró autorización alguna.
 */
export const EstadoAutorizacion = z.enum(["presente", "ambigua", "ausente"]);
export type EstadoAutorizacion = z.infer<typeof EstadoAutorizacion>;

/**
 * Esquema de extracción estructurada que el modelo debe devolver por documento.
 * Diseñado sobre el marco colombiano de Habeas Data:
 *  - Ley 1266 de 2008 (Habeas Data financiero / reportes a centrales de riesgo)
 *  - Ley 1581 de 2012 (régimen general de protección de datos personales)
 *  - Decreto 1377 de 2013 (autorización del titular)
 */
export const ResultadoSchema = z.object({
  titular: z
    .string()
    .describe(
      "Nombre completo del titular de los datos (el deudor / cliente). Si no se identifica, usar 'No identificado'.",
    ),
  documento_identidad: z
    .string()
    .nullable()
    .describe("Cédula o NIT del titular si aparece, de lo contrario null."),
  fecha_contrato: z
    .string()
    .nullable()
    .describe("Fecha del contrato en formato YYYY-MM-DD si es identificable, de lo contrario null."),
  tipo_documento: z
    .string()
    .describe("Tipo de documento, p. ej. 'Pagaré', 'Contrato de mutuo', 'Carta de instrucciones'."),

  autorizacion_tratamiento_datos: EstadoAutorizacion.describe(
    "¿El documento contiene autorización GENERAL para el tratamiento de datos personales (Ley 1581/2012)?",
  ),
  autorizacion_centrales_riesgo: EstadoAutorizacion.describe(
    "CLAVE DEL ANÁLISIS: ¿Existe autorización EXPRESA para reportar/consultar el comportamiento crediticio, " +
      "incluyendo reportes negativos, ante centrales de riesgo (Datacrédito, TransUnion, etc.) conforme a la Ley 1266/2008?",
  ),
  comunicacion_previa_reporte: EstadoAutorizacion.describe(
    "¿El documento informa o contempla la COMUNICACIÓN PREVIA al titular antes de reportar información negativa " +
      "y las reglas de permanencia/caducidad del dato negativo, conforme a la Ley 2157 de 2021 (que modificó la Ley 1266)? " +
      "Debe avisarse al titular al menos 20 días antes del reporte negativo.",
  ),

  cita_textual: z
    .string()
    .nullable()
    .describe(
      "Transcripción LITERAL de la cláusula que sustenta la decisión sobre centrales de riesgo. null si no existe.",
    ),
  pagina: z
    .number()
    .int()
    .nullable()
    .describe("Número de página donde aparece la cláusula citada. null si no aplica."),
  fundamento: z
    .string()
    .describe("Razonamiento jurídico breve (1-2 frases) que explica la clasificación."),
  confianza: z
    .number()
    .min(0)
    .max(1)
    .describe("Confianza del modelo en su análisis, de 0 a 1."),
});

export type Resultado = z.infer<typeof ResultadoSchema>;

/** Registro completo por documento, con metadatos de trazabilidad. */
export interface RegistroDocumento extends Resultado {
  id: string;
  nombre_archivo: string;
  hash_sha256: string;
  modelo: string;
  procesado_en: string; // ISO timestamp
  /** Derivado en el servidor: prioriza la revisión humana. */
  requiere_revision_humana: boolean;
  /** Prioridad calculada: 0 = urgente (ausente), 1 = ambiguo, 2 = ok. */
  prioridad: 0 | 1 | 2;
  /** Ruta de procesamiento (ej. "cerebras (texto)", "claude (visión, escaneado)"). */
  ruta?: string;
  /** true si Cerebras clasificó con baja confianza y Claude lo re-verificó. */
  reverificado?: boolean;
  error?: string;
}

/** Umbral por debajo del cual SIEMPRE se exige validación de un abogado. */
export const UMBRAL_CONFIANZA = 0.85;

/**
 * Cláusula de autorización CONFORME, lista para insertar en el contrato y corregir
 * los casos sin autorización o ambiguos. Cubre Ley 1581, Ley 1266 y Ley 2157.
 */
export function clausulaCorrectiva(titular: string): string {
  const quien = titular && titular !== "No identificado" ? titular : "EL DEUDOR (titular)";
  return (
    `AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS Y REPORTE A CENTRALES DE RIESGO. ${quien}, en ` +
    `calidad de titular, autoriza de manera previa, expresa, informada e irrevocable a EL ACREEDOR ` +
    `para: (i) recolectar, almacenar y tratar sus datos personales conforme a la Ley 1581 de 2012 y ` +
    `el Decreto 1377 de 2013; y (ii) consultar, reportar, procesar y actualizar ante los operadores ` +
    `de información financiera y centrales de riesgo (Datacrédito, TransUnion/Cifin) su comportamiento ` +
    `crediticio, incluida la información POSITIVA y NEGATIVA derivada del incumplimiento, conforme a la ` +
    `Ley 1266 de 2008. En cumplimiento de la Ley 2157 de 2021, EL ACREEDOR comunicará al titular, con ` +
    `una antelación mínima de veinte (20) días calendario, cualquier reporte de información negativa, y ` +
    `dicha información permanecerá únicamente por los plazos legales de permanencia. El titular podrá ` +
    `conocer, actualizar, rectificar y revocar esta autorización en cualquier momento.`
  );
}

/** Resumen ejecutivo en lenguaje natural, para gerencia / no-abogados. */
export function resumenEjecutivo(s: {
  total: number;
  conformes: number;
  sinAutorizacion: number;
  ambiguos: number;
  revision: number;
}): string {
  if (s.total === 0) return "";
  const pct = Math.round((s.conformes / s.total) * 100);
  const partes = [
    `De ${s.total} contrato(s) revisado(s), ${s.conformes} (${pct}%) autorizan el reporte a centrales de riesgo conforme a la normativa.`,
  ];
  if (s.sinAutorizacion > 0)
    partes.push(`${s.sinAutorizacion} no pueden reportarse por falta de autorización.`);
  if (s.ambiguos > 0)
    partes.push(`${s.ambiguos} presentan cláusulas ambiguas que deben reforzarse antes de reportar.`);
  partes.push(
    `En total, ${s.revision} caso(s) requieren validación de un abogado antes de cualquier reporte a centrales de riesgo.`,
  );
  return partes.join(" ");
}

/**
 * Acción recomendada según el estado de autorización para centrales de riesgo
 * (núcleo del reto). Convierte la clasificación en una decisión accionable para
 * un equipo sin abogados robustos.
 */
export function accionRecomendada(estado: EstadoAutorizacion): string {
  switch (estado) {
    case "presente":
      return "Autorización suficiente: el reporte y la consulta ante centrales de riesgo están permitidos conforme a la Ley 1266 de 2008.";
    case "ambigua":
      return "No reportar a centrales de riesgo hasta confirmar. Revisar y reforzar la cláusula con autorización expresa, incluida la información negativa.";
    case "ausente":
      return "NO reportar a centrales de riesgo. Solicitar al titular una autorización expresa y firmada antes de cualquier reporte; reportar sin ella es ilegal (sanción SIC).";
  }
}

/**
 * Regla de negocio: decide prioridad y necesidad de revisión humana.
 * En due diligence de datos, un falso "presente" puede derivar en un reporte
 * ilegal a una central de riesgo → el humano nunca sale del bucle.
 */
export function clasificarRiesgo(r: Resultado): {
  prioridad: 0 | 1 | 2;
  requiere_revision_humana: boolean;
} {
  const estados = [r.autorizacion_tratamiento_datos, r.autorizacion_centrales_riesgo];
  const hayAusente = estados.includes("ausente");
  const hayAmbigua = estados.includes("ambigua");
  const bajaConfianza = r.confianza < UMBRAL_CONFIANZA;

  let prioridad: 0 | 1 | 2 = 2;
  if (hayAusente) prioridad = 0;
  else if (hayAmbigua) prioridad = 1;

  return {
    prioridad,
    requiere_revision_humana: hayAusente || hayAmbigua || bajaConfianza,
  };
}

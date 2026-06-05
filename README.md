# Legamio Audit · Due diligence de datos · Habeas Data

MVP para el **Reto No. 1** (HackLegalTech): revisar +100 contratos en PDF —con y sin OCR— en 48
horas para identificar si autorizan el **reporte del comportamiento crediticio (incluido el dato
negativo) ante centrales de riesgo**.

Marco legal aplicado: **Ley 1266 de 2008** (Habeas Data financiero), **Ley 2157 de 2021** (modificó
la 1266: comunicación previa al reporte negativo y permanencia del dato), **Ley 1581 de 2012**
(régimen general de protección de datos) y **Decreto 1377 de 2013**.

## Idea central

**Motor híbrido que optimiza costo sin sacrificar los escaneados:**
- PDFs **con capa de texto** → se extrae el texto y lo clasifica **Cerebras** (gpt-oss-120b):
  barato y extremadamente rápido. Es la mayoría de la cartera.
- PDFs **escaneados sin OCR** → los lee **Claude** con su **visión nativa de PDF** (sin montar OCR
  aparte). Claude también **re-verifica** los casos en que Cerebras quedó con baja confianza (< 0.7).

El valor no está en "la IA clasifica PDFs", sino en el **flujo de revisión humana asistida**:
- La IA clasifica, **cita la cláusula textual con su número de página** y reporta su confianza.
- El sistema **prioriza** los casos sin autorización y ambiguos, y exige validación de un abogado
  cuando la confianza es baja (< 85%). El humano nunca sale del bucle.

## Arquitectura

```
PDF(s) ─▶ /api/analyze ─▶ extraer texto (unpdf)
            ├─ con texto ──────▶ Cerebras (gpt-oss-120b)  ── barato/rápido
            │                      └─ baja confianza ─▶ Claude visión (re-verifica)
            └─ escaneado ──────▶ Claude visión (lee la imagen, sin OCR)
                                 └─ generateObject + esquema Zod (extracción estructurada)
                                 └─ prompt caching del prompt legal (Claude)
        ◀─ JSON por documento: titular, fecha, estado de autorización,
           cita textual + página, confianza, motor usado, hash sha256 (trazabilidad)
Dashboard (React) ─▶ cola priorizada · filtros · estadísticas · export CSV/JSON
```

Archivos clave:
- `lib/types.ts` — esquema Zod de extracción y reglas de prioridad/revisión.
- `lib/analyze.ts` — llamada a Claude (AI SDK), prompt legal, hashing y procesamiento por lotes.
- `app/api/analyze/route.ts` — endpoint de carga y análisis.
- `app/page.tsx` — dashboard.
- `lib/sample.ts` + `app/api/demo` — datos de demostración (no consumen API).

## Cómo correrlo

```bash
cp .env.local.example .env.local   # añade CEREBRAS_API_KEY y/o ANTHROPIC_API_KEY
npm run dev                        # http://localhost:3000
```

- Sin clave: pulsa **"Cargar datos de ejemplo"** para ver el dashboard completo en la demo.
- Con clave(s): arrastra PDFs reales y pulsa **"Analizar"**.

Claves (puedes usar una o ambas):
- `CEREBRAS_API_KEY` — clasifica los PDFs con texto (modelo `CEREBRAS_MODEL`, por defecto `gpt-oss-120b`).
- `ANTHROPIC_API_KEY` — lee escaneados por visión y re-verifica (modelo `MODEL`, por defecto `claude-sonnet-4-6`).
- Solo Cerebras: funciona, pero los escaneados quedan marcados para revisión manual.

## Evaluación de exactitud

Para medir precisión/recall contra documentos etiquetados por un abogado (incluye matriz de
confusión y conteo de falsos positivos peligrosos):

```bash
# coloca PDFs en eval/pdfs/ y etiquétalos en eval/casos.json (ver eval/README.md)
npm run eval
```

## Detalles de robustez

- **Streaming de progreso:** `/api/analyze` emite NDJSON; el dashboard muestra los resultados
  conforme se procesan, con barra n/total.
- **PDFs híbridos:** si parte del documento es texto y parte imagen, se enruta completo a Claude
  visión para no perder lo escaneado.
- **Fallback:** si Cerebras falla (p. ej. JSON inválido), Claude re-procesa el documento.
- **Topes:** 20 MB por archivo y 200 documentos por lote; el texto a Cerebras se trunca.

## Próximos pasos (post-hackathon)

Escalabilidad: cola de trabajos + Anthropic **Batch API** (−50% costo) para los 100+ documentos,
almacenamiento y log de auditoría persistente, y validación con muestra etiquetada por un abogado
para medir precisión/recall antes de confiar a escala.

> La clasificación automática no sustituye el criterio jurídico. Todo documento ambiguo o sin
> autorización debe validarse antes de cualquier reporte a centrales de riesgo.

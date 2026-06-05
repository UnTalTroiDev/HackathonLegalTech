# HANDOFF — Continuidad del proyecto (léelo antes de empezar)

> Si eres una sesión nueva de Claude Code retomando este proyecto: **NO empieces de
> cero**, el código ya existe en esta carpeta. Lee este documento, corre `npm run dev`
> y `npm run build` para confirmar que todo está verde, y continúa desde donde quedó.

> ⚠️ **EL RETO PUEDE CAMBIAR EN CUALQUIER MOMENTO.** Hoy el proyecto resuelve el
> Reto N.º 1 (due diligence de habeas data), pero en un hackathon el enunciado puede
> cambiar de improviso. Si el usuario te entrega un **reto nuevo**, tu trabajo es
> **reorientar TODO el proyecto a ese reto** reutilizando esta misma base (ver la
> sección **"Si el reto cambia (pivote)"** al final). No reconstruyas desde cero: el
> motor, el dashboard, el streaming, los PDFs, los filtros y el diseño se reaprovechan.

## Proyecto
- **Nombre:** Legamio Audit (sub-producto de la marca **Legamio**).
- **Qué es:** MVP legal-tech para el **Reto N.º 1 de HackLegalTech** (Colombia). Hace
  **due diligence** de datos personales en contratos de crédito: revisa PDFs (con y sin
  OCR) y detecta si **autorizan el reporte del comportamiento crediticio —incluido el
  dato negativo— ante centrales de riesgo**.
- **Principio rector:** *La IA prioriza; el abogado decide* (human-in-the-loop — nunca
  quitar al abogado del bucle).
- **Ubicación:** `/Users/troidev/Desktop/HackLegalTech`
- **Correr:** `npm run dev` → http://localhost:3000 (pitch en `/pitch`)

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · AI SDK v6 ·
`@ai-sdk/cerebras` · `@ai-sdk/anthropic` · `unpdf` · `pdf-lib` · `sharp` (dev) · `zod` ·
`tsx` (dev).

## Arquitectura (4 piezas clave + lo reutilizable)
- **`lib/types.ts`** — esquema Zod `ResultadoSchema`: `titular`, `documento_identidad`,
  `fecha_contrato`, `tipo_documento`, `autorizacion_tratamiento_datos`,
  `autorizacion_centrales_riesgo`, `comunicacion_previa_reporte` (Ley 2157),
  `cita_textual`, `pagina`, `fundamento`, `confianza`. El tipo `RegistroDocumento` añade
  `id/hash_sha256/modelo/ruta/reverificado/prioridad/requiere_revision_humana`.
  Funciones puras: `clasificarRiesgo`, `accionRecomendada`, `clausulaCorrectiva`,
  `resumenEjecutivo`. Umbral de revisión humana: `UMBRAL_CONFIANZA = 0.85`.
- **`lib/analyze.ts`** — MOTOR HÍBRIDO. `extraerTexto` (unpdf, por página → modo
  `texto` / `escaneado` / `hibrido`). Texto → **Cerebras** (`gpt-oss-120b`); si falla,
  fallback a Claude; si confianza < 0.7, **reverifica** con Claude. Escaneado/híbrido →
  **Claude visión** (`claude-sonnet-4-6`) con *prompt caching*. Sin créditos de visión,
  degrada elegante a **"revisión manual"**. `analizarLote` emite resultados en streaming
  (callback `onResultado`).
- **`lib/sample.ts`** — 6 registros demo. **`lib/pdf.ts`** — `construirInforme` y
  `construirOficio` (pdf-lib).
- **APIs:** `app/api/analyze` (streaming NDJSON; topes 20 MB/archivo, 200 docs/lote),
  `app/api/demo`, `app/api/pdf`.
- **UI:** `app/page.tsx` (dashboard, client), `app/pitch/page.tsx` (server).
  `components/reveal-init.tsx`, `components/mask-title.tsx`. `app/icon.svg`,
  `app/opengraph-image.tsx`, `app/loading.tsx`.
- **Tooling:** `eval/` harness (`npm run eval`), `scripts/generar-pdfs.mjs`
  (`npm run samples` → `public/samples/01..04`).

## Diseño (mantener coherencia)
Dirección **"legal-tech cálido refinado"**. Tokens en `app/globals.css`: papel
`#fbfaf8`, tinta oscura, **PRIMARIO TEAL `#0f766e`** (el token se llama `oxblood` por
historia), acento coral `#c2410c`, semáforos `conforme/ambiguo/ausente` vívidos.
Fuentes: **Fraunces** (display serif), Geist Sans, Geist Mono. Marca: wordmark
**LEGAMIO AUDIT**, sello **"LA"**. Efectos: scroll-reveal bidireccional
(`.reveal` + `RevealInit`) en pitch/home; títulos del hero con revelado por palabra tras
máscara (`MaskTitle`). Respetar `prefers-reduced-motion`. Sin prueba social inventada.

## Marco legal aplicado
Ley 1266/2008 · Ley 2157/2021 · **Ley 2573/2026 (⚠️ NO verificada — confirmar en el
Diario Oficial antes de defenderla)** · Ley 1581/2012 · Decreto 1377/2013.

## Credenciales (`.env.local`, está en `.gitignore`, NO en el repo)
- `CEREBRAS_API_KEY` = activa · `CEREBRAS_MODEL=gpt-oss-120b` (esa cuenta solo da acceso
  a `gpt-oss-120b` y `zai-glm-4.7`).
- `ANTHROPIC_API_KEY` = **comentada** (sin créditos). Para activar la **ruta visión**:
  cargar ~5 USD en `console.anthropic.com/settings/billing` y descomentarla. Verificar
  IDs de modelo con `GET /v1/models` antes de confiar.

## Git
- Repo: `https://github.com/UnTalTroiDev/HackathonLegalTech.git` (rama `main`).
- El **push necesita un token de GitHub** (NO guardarlo en config; pasarlo inline y
  redactarlo en la salida).
- La carpeta embebida `LegalTechHack` (de VibeKanban, otro proyecto) está en
  `.gitignore` — **NO incluirla**.
- Convención: **commit + push al cerrar cada bloque de trabajo**.

## Estado actual
Compila limpio (`npx tsc --noEmit` + `npm run build` OK). La **ruta de texto con
Cerebras FUNCIONA** (verificada con PDFs reales). La **ruta visión está pendiente de
créditos** Anthropic (degrada a "revisión manual"). Ya implementado: dashboard priorizado
con cita + página, panel ejecutivo + galga animada + resumen narrativo, filtros
(estado/búsqueda/tipo/orden/ocultar revisados, toolbar sticky), informe y oficio en PDF,
cláusula correctiva (botón copiar), persistencia en localStorage, modo enfocado en
resultados, toasts, estado de bienvenida "3 pasos", accesibilidad (skip-link, ARIA,
contraste, reduce-motion), SEO + imagen OG, harness de evaluación y generador de PDFs de
prueba.

## Pendientes / ideas
- Activar visión real (créditos Anthropic) y reprobar PDFs escaneados (`03`/`04`).
- Verificar la Ley 2573/2026.
- Opcionales: chat sobre la cartera, checklist de cumplimiento por norma, historial de lotes.

## Si el reto cambia (pivote) — IMPORTANTE
**El reto puede cambiar en cualquier momento.** La arquitectura es deliberadamente
genérica para "revisar N documentos y clasificar/extraer algo", así que un pivote es
rápido. Cuando el usuario te dé un reto nuevo:

1. **Pídele estos 4 datos** (si no vienen en el enunciado):
   - El **enunciado completo** del nuevo reto.
   - Qué hay que **detectar / clasificar / extraer**.
   - Los **estados/categorías** posibles (p. ej. presente/ausente, sí/no, niveles…).
   - El **marco legal o reglas** aplicables (si las hay) y el **tipo de documentos** de entrada.
2. **Solo cambia estas 4 piezas** (el resto se reutiliza tal cual):
   - `lib/types.ts` → el **esquema Zod** (qué se extrae y qué estados existen) + las
     reglas de prioridad/acciones.
   - `lib/analyze.ts` → el **prompt legal/del dominio** (`SYSTEM_PROMPT`).
   - `lib/sample.ts` → los **datos demo** acordes al nuevo reto.
   - **Etiquetas de UI** (textos del hero, columnas, filtros, pitch).
3. **Se reutiliza sin tocar:** motor híbrido Cerebras + Claude visión, OCR/extracción,
   streaming, dashboard priorizado, filtros/búsqueda/orden, panel ejecutivo + resumen,
   informe/oficio en PDF, cláusula/plantilla generada, harness de eval, diseño y marca.
4. Tras pivotar: `npx tsc --noEmit`, `npm run build`, `npm run samples` (si aplica) y
   verifica con el modo demo. Luego commit + push.

> Si la marca o el nombre ya no encajan con el nuevo reto, pregúntale al usuario antes
> de cambiarlos (hoy es "Legamio Audit").

---
Antes de cambiar nada: corre `npm run dev` y `npm run build` para confirmar que todo sigue
verde. Pregunta el objetivo puntual de la sesión y continúa.
```

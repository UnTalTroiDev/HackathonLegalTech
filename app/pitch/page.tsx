import type { Metadata } from "next";
import Link from "next/link";
import { RevealInit } from "@/components/reveal-init";
import { MaskTitle } from "@/components/mask-title";

export const metadata: Metadata = {
  title: "Pitch",
  description:
    "Due Diligence de Datos: revisión asistida por IA de autorizaciones de habeas data y reporte a centrales de riesgo. Pitch del Reto No. 1 — HackLegalTech.",
};

function Kicker({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-sm font-bold text-acento">{n}</span>
      <h2 className="font-mono text-[13px] uppercase tracking-[0.22em] text-ink-soft">{children}</h2>
    </div>
  );
}

export default function Pitch() {
  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <RevealInit />
      {/* Barra superior */}
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold tracking-[0.18em] text-ink">
              LEGAMIO
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.18em] text-oxblood">
              AUDIT
            </span>
          </Link>
          <Link
            href="/"
            className="font-mono text-[13px] uppercase tracking-[0.18em] text-oxblood underline decoration-oxblood/40 underline-offset-4 hover:decoration-oxblood"
          >
            Ver demo →
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8">
        {/* Hero */}
        <section>
          <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.22em] text-acento">
            Pitch · HackLegalTech · Reto N.º 1
          </p>
          <MaskTitle
            text="Smart Due Diligence de documentos en minutos, no en semanas"
            className="font-display mt-3 text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl"
          />
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
            Revisamos cientos de contratos en PDF —con y sin OCR— e identificamos, con cita textual
            y página, si autorizan el reporte a centrales de riesgo. La IA prioriza; el abogado
            decide.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-oxblood px-5 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-oxblood-soft active:scale-[0.98]"
            >
              Probar la demo
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-rule bg-paper px-5 py-2.5 text-sm font-medium text-ink hover:border-ink/40"
            >
              Cargar expediente de ejemplo
            </Link>
          </div>
        </section>

        {/* Métricas de impacto */}
        <section
          className="reveal mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-4"
          style={{ transitionDelay: "80ms" }}
        >
          {[
            { n: "+100", l: "documentos por lote" },
            { n: "48 h", l: "plazo del reto" },
            { n: "100%", l: "PDFs con y sin OCR" },
            { n: "1", l: "abogado basta para validar" },
          ].map((m) => (
            <div key={m.l} className="bg-paper-2/60 px-4 py-6">
              <p className="font-display text-3xl text-ink tnum sm:text-4xl">{m.n}</p>
              <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-faint">
                {m.l}
              </p>
            </div>
          ))}
        </section>

        {/* El problema */}
        <section className="reveal mt-14" style={{ transitionDelay: "120ms" }}>
          <Kicker n="01">El problema</Kicker>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Una financiera de crédito debe hacer debida diligencia de los datos personales de sus
            clientes: <span className="text-ink">+100 contratos escaneados</span>, unos con OCR y
            otros sin él, y <span className="text-ink">48 horas</span> para revisarlos. Sin un equipo
            jurídico robusto y con poco conocimiento de IA. El punto crítico: saber si cada contrato{" "}
            <span className="text-ink">autoriza el reporte de calificaciones negativas a centrales
            de riesgo</span>. Hacerlo mal expone a sanciones de la SIC.
          </p>
        </section>

        {/* La solución */}
        <section className="reveal mt-12" style={{ transitionDelay: "140ms" }}>
          <Kicker n="02">La solución</Kicker>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              {
                t: "Lee con y sin OCR",
                d: "Usa la visión nativa de Claude sobre el PDF: procesa la capa de texto y las páginas escaneadas sin montar OCR aparte.",
              },
              {
                t: "Citas verificables",
                d: "Cada decisión trae la cláusula textual, su página y el nivel de confianza. Nada de respuestas inventadas.",
              },
              {
                t: "El humano no sale del bucle",
                d: "Prioriza los casos sin autorización y ambiguos, y exige validación del abogado cuando la confianza es baja.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-lg border border-rule bg-paper-2/50 p-5">
                <h3 className="font-display text-lg text-ink">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="reveal mt-12" style={{ transitionDelay: "160ms" }}>
          <Kicker n="03">Cómo funciona · motor híbrido</Kicker>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Optimizamos costo sin sacrificar los escaneados: el grueso de la cartera (PDFs con texto)
            lo clasifica <span className="text-ink">Cerebras</span> —barato y rapidísimo— y los
            escaneados o casos dudosos los resuelve <span className="text-ink">Claude</span> con
            visión.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-lg border border-rule bg-paper-2/60 p-5 font-mono text-[13px] leading-relaxed text-ink-soft">
{`PDF ─▶ extraer texto
   ├─ con texto    ─▶ Cerebras (gpt-oss-120b)    barato + rápido
   │                   └─ baja confianza ─▶ Claude visión (re-verifica)
   ├─ híbrido      ─▶ Claude visión (no perder lo escaneado)
   └─ escaneado    ─▶ Claude visión (lee la imagen, sin OCR)
        ◀─ JSON: titular · estado · cita + página · confianza · hash`}
          </pre>
        </section>

        {/* Marco legal */}
        <section className="reveal mt-12" style={{ transitionDelay: "180ms" }}>
          <Kicker n="04">Marco legal aplicado</Kicker>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Ley 1266 de 2008 · Habeas Data financiero", "Ley 2157 de 2021 · Comunicación previa y permanencia", "Ley 1581 de 2012 · Datos personales", "Decreto 1377 de 2013 · Autorización"].map(
              (l) => (
                <span
                  key={l}
                  className="rounded-md border border-rule bg-paper-2/50 px-3 py-1.5 font-mono text-[13px] text-ink-soft"
                >
                  {l}
                </span>
              ),
            )}
          </div>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-faint">
            Nota: las reformas y normas recientes de protección de datos (2025–2026) deben
            confirmarse en el Diario Oficial antes de citarlas en producción{" "}
            <span className="italic">(por verificar)</span>.
          </p>
        </section>

        {/* Por qué gana */}
        <section className="reveal mt-12" style={{ transitionDelay: "200ms" }}>
          <Kicker n="05">Por qué gana</Kicker>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "No es «la IA clasifica PDFs»: es revisión humana asistida, auditable y con citas.",
              "Trazabilidad: hash SHA-256, modelo y motor por documento.",
              "Costo a escala resuelto con el motor híbrido Cerebras + Claude.",
              "Español-first y normativa colombiana específica.",
              "Rigor medible: harness de evaluación con precisión/recall.",
              "Funciona hoy: demo cargable en un clic, con o sin API key.",
            ].map((t) => (
              <li key={t} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-oxblood" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Mercado Colombia */}
        <section className="reveal mt-12" style={{ transitionDelay: "220ms" }}>
          <Kicker n="06">Oportunidad en Colombia</Kicker>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            El boom de crédito digital multiplica las obligaciones de habeas data y cobranza, la SIC
            está activa y el grueso del mercado —pymes y abogados independientes— no tiene equipo ni
            herramientas, casi todo el software top está en inglés. RegTech de datos personales +
            cobranza es un dolor recurrente, con ROI medible y compras repetidas. Este MVP es la
            puerta de entrada.
          </p>
        </section>

        {/* Roadmap */}
        <section className="reveal mt-12" style={{ transitionDelay: "240ms" }}>
          <Kicker n="07">Roadmap</Kicker>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { t: "Hoy · MVP", d: "Auditoría de autorizaciones con citas, motor híbrido y dashboard priorizado." },
              { t: "Siguiente", d: "Subida a Blob + Batch API (−50% costo), persistencia y log de auditoría, autenticación." },
              { t: "Producto", d: "Generación de cláusulas conformes y monitoreo continuo de cobranza y reportes." },
            ].map((c) => (
              <div key={c.t} className="rounded-lg border border-rule bg-paper-2/50 p-5">
                <h3 className="font-mono text-[13px] uppercase tracking-[0.14em] text-oxblood">
                  {c.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section
          className="reveal mt-14 rounded-lg border border-rule bg-paper-2/60 px-6 py-8 text-center"
          style={{ transitionDelay: "260ms" }}
        >
          <h2 className="font-display text-2xl text-ink sm:text-3xl">Véelo en acción</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Carga el expediente de ejemplo y observa la cola priorizada, las citas y la confianza en
            segundos.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center rounded-lg bg-oxblood px-6 py-3 text-sm font-semibold text-paper shadow-sm transition hover:bg-oxblood-soft active:scale-[0.98]"
          >
            Abrir la demo →
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule">
        <p className="mx-auto w-full max-w-4xl px-5 py-6 text-[12px] leading-relaxed text-ink-faint sm:px-8">
          MVP de hackathon · La clasificación automática no sustituye el criterio jurídico. Todo
          documento ambiguo o sin autorización debe ser validado por un abogado antes de cualquier
          reporte a centrales de riesgo.
        </p>
      </footer>
    </div>
  );
}

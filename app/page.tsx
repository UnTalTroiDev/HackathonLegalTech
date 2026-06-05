"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RevealInit } from "@/components/reveal-init";
import { MaskTitle } from "@/components/mask-title";
import {
  accionRecomendada,
  clausulaCorrectiva,
  resumenEjecutivo,
  type EstadoAutorizacion,
  type RegistroDocumento,
} from "@/lib/types";

const SAMPLES = [
  { f: "01_autoriza_centrales.pdf", t: "Texto · autoriza" },
  { f: "02_ambiguo_tratamiento.pdf", t: "Texto · ambiguo" },
  { f: "03_escaneado_sin_ocr.pdf", t: "Escaneado · visión" },
  { f: "04_hibrido.pdf", t: "Híbrido" },
];
const STORAGE_KEY = "dd:estado:v1";

type Filtro = "todos" | "prioritarios" | "ausente" | "ambigua" | "conformes";

const ESTADO_UI: Record<
  EstadoAutorizacion,
  { label: string; chip: string; dot: string }
> = {
  presente: {
    label: "Presente",
    chip: "bg-conforme-bg text-conforme ring-conforme/20",
    dot: "bg-conforme",
  },
  ambigua: {
    label: "Ambigua",
    chip: "bg-ambiguo-bg text-ambiguo ring-ambiguo/20",
    dot: "bg-ambiguo",
  },
  ausente: {
    label: "Ausente",
    chip: "bg-ausente-bg text-ausente ring-ausente/20",
    dot: "bg-ausente",
  },
};

function Badge({ estado }: { estado: EstadoAutorizacion }) {
  const u = ESTADO_UI[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${u.chip}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${u.dot}`} />
      {u.label}
    </span>
  );
}

function Motor({ ruta }: { ruta?: string }) {
  if (!ruta) return null;
  const manual = /manual|error/i.test(ruta);
  const cerebras = ruta.startsWith("cerebras (");
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-wide ring-1 ring-inset ${
        manual
          ? "text-ink-soft bg-ink/5 ring-rule"
          : cerebras
            ? "text-oxblood bg-oxblood/8 ring-oxblood/20"
            : "text-conforme bg-conforme/10 ring-conforme/20"
      }`}
    >
      {ruta}
    </span>
  );
}

/** Sello/lacre decorativo con texto circular. */
function Sello() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="seal-in h-16 w-16 text-oxblood"
      style={{ transform: "rotate(-8deg)" }}
    >
      <defs>
        <path id="anillo" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <text className="font-mono" fontSize="7.1" letterSpacing="1.1" fill="currentColor">
        <textPath href="#anillo" startOffset="0%">
          · LEGAMIO AUDIT · HABEAS DATA · LEY 1266 ·
        </textPath>
      </text>
      <text
        x="50"
        y="58"
        textAnchor="middle"
        className="font-display"
        fontSize="26"
        fontStyle="italic"
        fill="currentColor"
      >
        LA
      </text>
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Galga circular (% conforme) que se llena de 0→pct al aparecer. */
function Gauge({ pct }: { pct: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setVal(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - val / 100);
  return (
    <div
      className="relative grid h-16 w-16 shrink-0 place-items-center"
      role="img"
      aria-label={`${pct}% de la cartera conforme`}
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-rule)" strokeWidth="6" />
        <circle
          className="gauge-ring"
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--color-conforme)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <span className="absolute font-display text-sm text-ink tnum">{pct}%</span>
    </div>
  );
}

type Toast = { id: number; msg: string; tipo: "ok" | "error" };
type Orden = "prioridad" | "confianza-asc" | "confianza-desc" | "titular";

export default function Page() {
  const [registros, setRegistros] = useState<RegistroDocumento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [esDemo, setEsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("prioritarios");
  const [abierto, setAbierto] = useState<Record<string, boolean>>({});
  const [revisados, setRevisados] = useState<Record<string, boolean>>({});
  const [pendientes, setPendientes] = useState<File[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number }>({
    hechos: 0,
    total: 0,
  });
  const [descargando, setDescargando] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("prioridad");
  const [ocultarRevisados, setOcultarRevisados] = useState(false);
  const [tipoDoc, setTipoDoc] = useState<string>("todos");
  const [intakeAbierto, setIntakeAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function toast(msg: string, tipo: "ok" | "error" = "ok") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }

  async function copiar(texto: string, etiqueta: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast(`${etiqueta} copiada al portapapeles`);
    } catch {
      toast("No se pudo copiar", "error");
    }
  }

  // Persistencia: recupera resultados al cargar (no se pierde la demo al recargar).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (Array.isArray(s.registros) && s.registros.length) {
        setRegistros(s.registros);
        setRevisados(s.revisados ?? {});
        setEsDemo(!!s.esDemo);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (registros.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ registros, revisados, esDemo }));
    } catch {
      /* ignore */
    }
  }, [registros, revisados, esDemo]);

  const stats = useMemo(() => {
    const total = registros.length;
    const sinAutorizacion = registros.filter(
      (r) => r.autorizacion_centrales_riesgo === "ausente",
    ).length;
    const ambiguos = registros.filter(
      (r) =>
        r.autorizacion_centrales_riesgo === "ambigua" ||
        r.autorizacion_tratamiento_datos === "ambigua",
    ).length;
    const conformes = registros.filter((r) => r.prioridad === 2).length;
    const revision = registros.filter((r) => r.requiere_revision_humana).length;
    return { total, sinAutorizacion, ambiguos, conformes, revision };
  }, [registros]);

  // Tipos de documento presentes en la cartera (con su conteo, mayor primero).
  const tiposDisponibles = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of registros) m.set(r.tipo_documento, (m.get(r.tipo_documento) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [registros]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const f = registros.filter((r) => {
      if (ocultarRevisados && revisados[r.id]) return false;
      if (tipoDoc !== "todos" && r.tipo_documento !== tipoDoc) return false;
      if (
        q &&
        !r.titular.toLowerCase().includes(q) &&
        !r.nombre_archivo.toLowerCase().includes(q) &&
        !(r.documento_identidad ?? "").toLowerCase().includes(q)
      )
        return false;
      switch (filtro) {
        case "prioritarios":
          return r.prioridad <= 1;
        case "ausente":
          return r.autorizacion_centrales_riesgo === "ausente";
        case "ambigua":
          return (
            r.autorizacion_centrales_riesgo === "ambigua" ||
            r.autorizacion_tratamiento_datos === "ambigua"
          );
        case "conformes":
          return r.prioridad === 2;
        default:
          return true;
      }
    });
    const cmp: Record<Orden, (a: RegistroDocumento, b: RegistroDocumento) => number> = {
      prioridad: (a, b) => a.prioridad - b.prioridad || a.confianza - b.confianza,
      "confianza-asc": (a, b) => a.confianza - b.confianza,
      "confianza-desc": (a, b) => b.confianza - a.confianza,
      titular: (a, b) => a.titular.localeCompare(b.titular, "es"),
    };
    return [...f].sort(cmp[orden]);
  }, [registros, filtro, busqueda, orden, ocultarRevisados, revisados, tipoDoc]);

  function añadir(fs: File[]) {
    const pdfs = fs.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    // Evita duplicados por nombre+tamaño
    setPendientes((p) => {
      const clave = (f: File) => `${f.name}:${f.size}`;
      const vistos = new Set(p.map(clave));
      return [...p, ...pdfs.filter((f) => !vistos.has(clave(f)))];
    });
  }

  function quitar(i: number) {
    setPendientes((p) => p.filter((_, idx) => idx !== i));
  }

  async function analizar() {
    if (pendientes.length === 0) {
      inputRef.current?.click();
      return;
    }
    setCargando(true);
    setError(null);
    setAviso(null);
    setRegistros([]);
    setEsDemo(false);
    setFiltro("prioritarios");
    setTipoDoc("todos");
    setProgreso({ hechos: 0, total: pendientes.length });
    try {
      const fd = new FormData();
      pendientes.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al analizar.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const linea = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!linea) continue;
          const msg = JSON.parse(linea);
          if (msg.type === "start") {
            setProgreso({ hechos: 0, total: msg.total });
            if (msg.avisos?.length) setAviso(msg.avisos.join(" · "));
          } else if (msg.type === "result") {
            setRegistros((prev) => [...prev, msg.registro]);
            setProgreso((p) => ({ ...p, hechos: p.hechos + 1 }));
          } else if (msg.type === "error") {
            setError(msg.error);
          }
        }
      }
      setPendientes([]);
      setIntakeAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarDemo() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/demo");
      const data = await res.json();
      setRegistros(data.registros);
      setEsDemo(true);
      setFiltro("prioritarios");
      setTipoDoc("todos");
      setIntakeAbierto(false);
      toast(`Cargados ${data.registros.length} documentos de ejemplo`);
    } finally {
      setCargando(false);
    }
  }

  function descargar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarJSON() {
    descargar(
      new Blob([JSON.stringify(registros, null, 2)], { type: "application/json" }),
      "due-diligence-datos.json",
    );
    toast("JSON exportado");
  }

  function exportarCSV() {
    const cols = [
      "nombre_archivo",
      "titular",
      "documento_identidad",
      "fecha_contrato",
      "tipo_documento",
      "autorizacion_tratamiento_datos",
      "autorizacion_centrales_riesgo",
      "comunicacion_previa_reporte",
      "pagina",
      "confianza",
      "requiere_revision_humana",
      "ruta",
      "cita_textual",
    ] as const;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const filas = registros.map((r) => cols.map((c) => esc(r[c])).join(","));
    const csv = [cols.join(","), ...filas].join("\n");
    descargar(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), "due-diligence-datos.csv");
    toast("CSV exportado");
  }

  async function descargarPdf(payload: object, fallback: string, key: string) {
    setDescargando(key);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo generar el PDF.");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const nombre = /filename="([^"]+)"/.exec(cd)?.[1] ?? fallback;
      descargar(blob, nombre);
      toast(`Descarga lista: ${nombre}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al generar el PDF.", "error");
    } finally {
      setDescargando(null);
    }
  }

  function limpiarTodo() {
    setRegistros([]);
    setRevisados({});
    setEsDemo(false);
    setError(null);
    setAviso(null);
    setTipoDoc("todos");
    setBusqueda("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  const FILTROS: { id: Filtro; label: string; n: number }[] = [
    { id: "prioritarios", label: "Prioritarios", n: stats.sinAutorizacion + stats.ambiguos },
    { id: "ausente", label: "Sin autorización", n: stats.sinAutorizacion },
    { id: "ambigua", label: "Ambiguos", n: stats.ambiguos },
    { id: "conformes", label: "Conformes", n: stats.conformes },
    { id: "todos", label: "Todos", n: stats.total },
  ];

  const pctConforme = stats.total ? Math.round((stats.conformes / stats.total) * 100) : 0;

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <RevealInit />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Saltar al contenido
      </a>
      {/* Barra superior */}
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold tracking-[0.18em] text-ink">
              LEGAMIO
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.18em] text-oxblood">
              AUDIT
            </span>
          </div>
          <Link
            href="/pitch"
            className="font-mono text-[13px] uppercase tracking-[0.18em] text-oxblood underline decoration-oxblood/40 underline-offset-4 hover:decoration-oxblood"
          >
            Pitch →
          </Link>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        {/* Hero — solo en la landing (modo enfocado oculta esto al haber resultados) */}
        {registros.length === 0 && (
        <section className="grid items-start gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.22em] text-acento">
              Debida diligencia · Protección de datos
            </p>
            <MaskTitle
              text="Autorización de datos y reporte a centrales de riesgo"
              className="font-display mt-3 text-4xl leading-[1.05] tracking-tight text-ink sm:text-[3.4rem]"
            />
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
              Revisa contratos en PDF —con o sin OCR— e identifica si autorizan el reporte del
              comportamiento crediticio, incluido el dato negativo, ante centrales de riesgo.{" "}
              <span className="text-ink">La IA prioriza; el abogado decide.</span>
            </p>

            {/* CTAs primarios */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={cargarDemo}
                disabled={cargando}
                className="inline-flex items-center gap-2 rounded-xl bg-oxblood px-6 py-3 text-base font-semibold text-paper shadow-sm transition hover:bg-oxblood-soft active:scale-[0.98] disabled:opacity-50"
              >
                {cargando && esDemo && <Spinner />}
                Cargar expediente de ejemplo
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-oxblood/30 bg-paper px-6 py-3 text-base font-semibold text-oxblood transition hover:border-oxblood active:scale-[0.98]"
              >
                Subir PDFs
              </button>
            </div>

            {/* Tira de credibilidad */}
            <dl className="mt-7 grid max-w-xl grid-cols-3 gap-3">
              {[
                { v: "Minutos", l: "lo que tomaba 48 horas" },
                { v: "Con y sin OCR", l: "lee texto y escaneados" },
                { v: "Cita + página", l: "cada decisión, trazable" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-rule bg-paper-2/50 px-3 py-3">
                  <dd className="font-display text-lg leading-tight text-oxblood">{s.v}</dd>
                  <dt className="mt-1 text-[12px] leading-snug text-ink-faint">{s.l}</dt>
                </div>
              ))}
            </dl>

            {/* Marco legal (compacto) + motor */}
            <div className="mt-6 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                Marco:
              </span>
              {["Ley 1266/2008", "Ley 2157/2021", "Ley 2573/2026", "Ley 1581/2012", "Decreto 1377/2013"].map(
                (l) => (
                  <span
                    key={l}
                    className="rounded-md border border-rule bg-paper-2/50 px-2 py-1 font-mono text-[12px] text-ink-soft"
                  >
                    {l}
                  </span>
                ),
              )}
            </div>
            <p className="mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-oxblood" /> Cerebras · texto
              </span>
              <span aria-hidden>+</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-conforme" /> Claude visión ·
                escaneados
              </span>
            </p>
          </div>
          <div className="hidden justify-self-end sm:block">
            <Sello />
          </div>
        </section>
        )}

        {/* Intake / carga */}
        <section
          className="rise mt-9 rounded-lg border border-rule bg-paper-2/60 p-5"
          style={{ animationDelay: "80ms" }}
          aria-label="Cargar documentos"
        >
          <input
            ref={inputRef}
            id="files"
            type="file"
            accept="application/pdf"
            multiple
            hidden
            onChange={(e) => añadir(Array.from(e.target.files ?? []))}
          />
          {(registros.length === 0 || intakeAbierto) && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              añadir(Array.from(e.dataTransfer.files));
            }}
            className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-9 text-center transition-colors ${
              arrastrando ? "border-oxblood bg-oxblood/5" : "border-rule bg-paper"
            }`}
          >
            <p className="text-sm text-ink">
              Arrastra aquí los contratos o{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-medium text-oxblood underline decoration-oxblood/40 underline-offset-4 hover:decoration-oxblood"
              >
                selecciónalos
              </button>
            </p>
            <p className="mt-1.5 font-mono text-[13px] text-ink-faint">
              PDF con y sin OCR · hasta cientos de documentos
            </p>
            {pendientes.length > 0 && (
              <ul className="mt-4 flex max-w-full flex-wrap justify-center gap-1.5">
                {pendientes.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2 py-1 font-mono text-[13px] text-ink-soft"
                  >
                    <span className="max-w-[14rem] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => quitar(i)}
                      aria-label={`Quitar ${f.name} de la cola`}
                      className="leading-none text-ink-faint hover:text-ausente"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {registros.length > 0 && (
              <button
                onClick={() => setIntakeAbierto((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-paper px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/40"
              >
                {intakeAbierto ? "Ocultar zona de carga" : "+ Analizar más documentos"}
              </button>
            )}
            {(registros.length === 0 || intakeAbierto) && (
              <>
                <button
                  onClick={analizar}
                  disabled={cargando}
                  className="inline-flex items-center gap-2 rounded-lg bg-oxblood px-5 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-oxblood-soft active:scale-[0.98] disabled:opacity-50"
                >
                  {cargando
                    ? "Analizando…"
                    : pendientes.length
                      ? `Analizar ${pendientes.length} documento(s)`
                      : "Seleccionar PDFs"}
                </button>
                <button
                  onClick={cargarDemo}
                  disabled={cargando}
                  className="inline-flex items-center gap-2 rounded-lg border border-rule bg-paper px-4 py-2.5 text-sm font-medium text-ink transition hover:border-ink/40 disabled:opacity-50"
                >
                  {cargando && esDemo && <Spinner />}
                  Cargar expediente de ejemplo
                </button>
                {pendientes.length > 0 && (
                  <button
                    onClick={() => setPendientes([])}
                    className="text-sm text-ink-faint underline-offset-4 hover:text-ink hover:underline"
                  >
                    Vaciar cola
                  </button>
                )}
              </>
            )}
            {registros.length > 0 && (
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={() => descargarPdf({ tipo: "informe", registros }, "informe.pdf", "informe")}
                  disabled={descargando === "informe"}
                  className="inline-flex items-center gap-2 rounded-lg bg-oxblood px-3 py-2 text-sm font-medium text-paper transition hover:bg-oxblood-soft disabled:opacity-60"
                >
                  {descargando === "informe" && <Spinner />}
                  {descargando === "informe" ? "Generando…" : "Informe PDF"}
                </button>
                <button
                  onClick={exportarCSV}
                  className="rounded-lg border border-rule bg-paper px-3 py-2 text-sm font-medium text-ink hover:border-ink/40"
                >
                  CSV
                </button>
                <button
                  onClick={exportarJSON}
                  className="rounded-lg border border-rule bg-paper px-3 py-2 text-sm font-medium text-ink hover:border-ink/40"
                >
                  JSON
                </button>
                {confirmarLimpiar ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-ausente/30 bg-ausente-bg px-2 py-1 text-sm text-ausente">
                    ¿Borrar todo?
                    <button
                      onClick={() => {
                        limpiarTodo();
                        setConfirmarLimpiar(false);
                      }}
                      className="rounded px-1.5 font-medium underline-offset-2 hover:underline"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmarLimpiar(false)}
                      className="rounded px-1.5 text-ink-soft hover:text-ink"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmarLimpiar(true)}
                    className="rounded-lg border border-rule bg-paper px-3 py-2 text-sm font-medium text-ink-soft hover:border-ausente/40 hover:text-ausente"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>

          {(registros.length === 0 || intakeAbierto) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
            <span className="font-mono text-[12px] uppercase tracking-wide text-ink-faint">
              PDFs de prueba:
            </span>
            {SAMPLES.map((s) => (
              <a
                key={s.f}
                href={`/samples/${s.f}`}
                download
                className="rounded-md border border-rule bg-paper px-2 py-1 font-mono text-[13px] text-ink-soft hover:border-ink/40"
              >
                {s.t} ↓
              </a>
            ))}
          </div>
          )}

          {cargando && progreso.total > 0 && (
            <div className="mt-4" aria-live="polite">
              <div className="flex items-center justify-between font-mono text-[13px] text-ink-soft">
                <span>
                  Procesando {progreso.hechos}/{progreso.total}
                </span>
                <span className="tnum">
                  {Math.round((progreso.hechos / progreso.total) * 100)}%
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-rule">
                <div
                  className="h-full bg-oxblood transition-[width] duration-300"
                  style={{ width: `${(progreso.hechos / progreso.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {aviso && (
            <p className="mt-3 rounded-lg bg-ambiguo-bg px-3 py-2 text-sm text-ambiguo ring-1 ring-inset ring-ambiguo/20">
              {aviso}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-ausente-bg px-3 py-2 text-sm text-ausente ring-1 ring-inset ring-ausente/20"
            >
              {error}
            </p>
          )}
        </section>

        {registros.length === 0 ? (
          <section className="mt-10 overflow-hidden rounded-2xl border border-rule bg-gradient-to-b from-paper-2/70 to-paper px-6 py-12 text-center sm:px-10">
            <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-acento">
              Bienvenido
            </p>
            <h2 className="font-display mt-3 text-3xl text-ink sm:text-4xl">
              Empieza tu revisión en 3 pasos
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Revisa cientos de contratos y descubre en minutos cuáles autorizan el reporte a
              centrales de riesgo.
            </p>

            <ol className="mx-auto mt-10 grid max-w-3xl gap-5 text-left sm:grid-cols-3">
              {[
                {
                  n: "1",
                  color: "bg-oxblood",
                  t: "Sube los contratos",
                  d: "Arrastra tus PDFs (con o sin OCR) o usa los de prueba.",
                },
                {
                  n: "2",
                  color: "bg-acento",
                  t: "La IA clasifica",
                  d: "Detecta autorizaciones y cita la cláusula con su número de página.",
                },
                {
                  n: "3",
                  color: "bg-oxblood",
                  t: "Prioriza y actúa",
                  d: "Revisa los casos críticos y genera el informe u oficio.",
                },
              ].map((s) => (
                <li
                  key={s.n}
                  className="group rounded-xl border border-rule bg-paper p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-paper ${s.color}`}
                  >
                    <span className="font-display text-2xl leading-none">{s.n}</span>
                  </div>
                  <p className="mt-4 font-display text-xl text-ink">{s.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.d}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={cargarDemo}
                disabled={cargando}
                className="inline-flex items-center gap-2 rounded-xl bg-oxblood px-7 py-3.5 text-base font-semibold text-paper shadow-sm transition hover:bg-oxblood-soft disabled:opacity-50"
              >
                {cargando && <Spinner />}
                Cargar expediente de ejemplo
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-oxblood/30 bg-paper px-7 py-3.5 text-base font-semibold text-oxblood transition hover:border-oxblood"
              >
                Subir mis PDFs
              </button>
            </div>
            <p className="mt-3 text-[13px] text-ink-faint">
              Sin necesidad de cuenta · los de ejemplo no consumen API
            </p>
          </section>
        ) : (
          <>
            {esDemo && (
              <p className="mt-6 inline-flex rounded-md bg-ambiguo-bg px-3 py-1.5 font-mono text-[13px] text-ambiguo ring-1 ring-inset ring-ambiguo/20">
                Expediente de demostración · no se consumió la API
              </p>
            )}

            {/* Panel ejecutivo */}
            <section
              className="mt-7 flex flex-col gap-4 rounded-lg border border-rule border-l-4 border-l-oxblood bg-paper-2/50 p-5 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Veredicto ejecutivo"
            >
              <div className="flex items-center gap-4">
                <Gauge pct={pctConforme} />
                <div>
                  <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-faint">
                    Cartera conforme
                  </p>
                  <p className="font-display text-2xl text-ink">
                    {stats.conformes} de {stats.total} contratos
                  </p>
                </div>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-ink-soft">
                {stats.sinAutorizacion > 0 ? (
                  <>
                    <span className="font-medium text-ausente">
                      {stats.sinAutorizacion} contrato(s)
                    </span>{" "}
                    no pueden reportarse a centrales de riesgo: falta autorización. Priorízalos antes
                    de cualquier reporte.
                  </>
                ) : stats.ambiguos > 0 ? (
                  <>
                    Sin ausencias críticas, pero{" "}
                    <span className="font-medium text-ambiguo">{stats.ambiguos} caso(s)</span>{" "}
                    requieren revisión antes de reportar.
                  </>
                ) : (
                  "Toda la cartera revisada cuenta con autorización suficiente para reportar."
                )}
              </p>
            </section>

            {/* Estadísticas */}
            <section className="mt-5" aria-label="Resumen del expediente">
              <dl className="grid grid-cols-2 divide-rule border-y border-rule sm:grid-cols-4 sm:divide-x">
                <Stat label="Documentos" valor={stats.total} tono="text-ink" />
                <Stat label="Sin autorización" valor={stats.sinAutorizacion} tono="text-ausente" />
                <Stat label="Ambiguos" valor={stats.ambiguos} tono="text-ambiguo" />
                <Stat label="Conformes" valor={stats.conformes} tono="text-conforme" />
              </dl>
              <div className="mt-4 rounded-lg border-l-2 border-oxblood bg-paper-2/40 px-4 py-3">
                <p className="font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                  Resumen ejecutivo
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {resumenEjecutivo(stats)}
                </p>
              </div>
            </section>

            {/* Barra de herramientas (sticky) */}
            <div className="sticky top-0 z-20 -mx-5 mt-7 border-b border-rule bg-paper/90 px-5 backdrop-blur sm:-mx-8 sm:px-8">
              <div
                aria-label="Filtrar documentos"
                className="flex flex-wrap gap-x-6 gap-y-2 pt-3"
              >
                {FILTROS.map((f) => {
                  const activo = filtro === f.id;
                  return (
                    <button
                      key={f.id}
                      aria-pressed={activo}
                      onClick={() => setFiltro(f.id)}
                      className={`border-b-2 pb-2 text-sm font-medium transition ${
                        activo
                          ? "border-oxblood text-ink"
                          : "border-transparent text-ink-faint hover:text-ink"
                      }`}
                    >
                      {f.label} <span className="font-mono text-xs text-ink-faint">{f.n}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3 py-3">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar titular, archivo o cédula…"
                  aria-label="Buscar documentos"
                  className="min-w-[12rem] flex-1 rounded-lg border border-rule bg-paper px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint"
                />
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  Tipo
                  <select
                    value={tipoDoc}
                    onChange={(e) => setTipoDoc(e.target.value)}
                    aria-label="Filtrar por tipo de documento"
                    className="max-w-[16rem] rounded-lg border border-rule bg-paper px-2 py-1.5 text-sm text-ink"
                  >
                    <option value="todos">Todos los tipos ({registros.length})</option>
                    {tiposDisponibles.map(([tipo, n]) => (
                      <option key={tipo} value={tipo}>
                        {tipo} ({n})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  Orden
                  <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as Orden)}
                    className="rounded-lg border border-rule bg-paper px-2 py-1.5 text-sm text-ink"
                  >
                    <option value="prioridad">Prioridad</option>
                    <option value="confianza-desc">Confianza ↓</option>
                    <option value="confianza-asc">Confianza ↑</option>
                    <option value="titular">Titular A–Z</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={ocultarRevisados}
                    onChange={(e) => setOcultarRevisados(e.target.checked)}
                    className="accent-oxblood"
                  />
                  Ocultar revisados
                </label>
                <span className="ml-auto font-mono text-[13px] text-ink-faint">
                  {visibles.length} mostrados
                </span>
              </div>
            </div>

            {/* Lista de registros */}
            <section className="mt-5 space-y-3 pb-4">
              {visibles.length === 0 && (
                <p className="rounded-lg border border-dashed border-rule px-4 py-8 text-center font-mono text-[12px] text-ink-faint">
                  {busqueda.trim()
                    ? `Sin coincidencias para «${busqueda.trim()}».`
                    : "No hay documentos en esta categoría."}
                </p>
              )}
              {visibles.map((r, i) => {
                const open = abierto[r.id];
                const revisado = revisados[r.id];
                const acento =
                  r.prioridad === 0
                    ? "before:bg-ausente"
                    : r.prioridad === 1
                      ? "before:bg-ambiguo"
                      : "before:bg-conforme";
                return (
                  <article
                    key={r.id}
                    className={`rise relative overflow-hidden rounded-lg border border-rule bg-paper-2/50 transition-shadow hover:shadow-md before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] ${acento} ${
                      revisado ? "opacity-55" : ""
                    }`}
                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                  >
                    <button
                      onClick={() => setAbierto((a) => ({ ...a, [r.id]: !a[r.id] }))}
                      aria-expanded={!!open}
                      aria-controls={`det-${r.id}`}
                      className="relative flex w-full flex-col gap-3 py-4 pl-5 pr-10 text-left sm:flex-row sm:items-start sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-mono text-[13px] text-ink-faint">
                            {r.nombre_archivo}
                          </span>
                          <Motor ruta={r.ruta} />
                          {revisado && (
                            <span className="rounded-md bg-ink/10 px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-wide text-ink-soft">
                              Revisado
                            </span>
                          )}
                        </div>
                        <p className="font-display mt-1 truncate text-xl text-ink">
                          {r.titular}
                          {r.documento_identidad && (
                            <span className="font-sans text-sm font-normal text-ink-faint">
                              {" "}
                              · {r.documento_identidad}
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-[13px] text-ink-soft">
                          {r.tipo_documento}
                          {r.fecha_contrato && ` · ${r.fecha_contrato}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-row flex-wrap gap-x-4 gap-y-1.5 sm:flex-col sm:items-end">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px] uppercase text-ink-faint">
                            Centrales
                          </span>
                          <Badge estado={r.autorizacion_centrales_riesgo} />
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px] uppercase text-ink-faint">
                            Tratamiento
                          </span>
                          <Badge estado={r.autorizacion_tratamiento_datos} />
                        </span>
                      </div>
                      <span className="absolute right-3 top-4">
                        <Chevron open={!!open} />
                      </span>
                    </button>

                    {open && (
                      <div
                        id={`det-${r.id}`}
                        className="border-t border-rule px-5 py-5 text-sm"
                      >
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                            Comunicación previa al reporte negativo · Ley 2157/2021:
                          </span>
                          <Badge estado={r.comunicacion_previa_reporte} />
                        </div>
                        <div className="grid gap-6 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <p className="font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                              Cláusula citada {r.pagina ? `· pág. ${r.pagina}` : ""}
                            </p>
                            {r.cita_textual ? (
                              <blockquote className="font-display mt-2 border-l-2 border-oxblood/40 pl-4 text-[15px] italic leading-relaxed text-ink">
                                “{r.cita_textual}”
                              </blockquote>
                            ) : (
                              <p className="mt-2 text-ink-faint">
                                No se identificó cláusula de autorización.
                              </p>
                            )}
                            <p className="mt-4 font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                              Fundamento
                            </p>
                            <p className="mt-1.5 leading-relaxed text-ink-soft">{r.fundamento}</p>

                            <p className="mt-4 font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                              Acción recomendada
                            </p>
                            <p
                              className={`mt-1.5 rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                                r.autorizacion_centrales_riesgo === "presente"
                                  ? "bg-conforme-bg text-conforme"
                                  : r.autorizacion_centrales_riesgo === "ambigua"
                                    ? "bg-ambiguo-bg text-ambiguo"
                                    : "bg-ausente-bg text-ausente"
                              }`}
                            >
                              {accionRecomendada(r.autorizacion_centrales_riesgo)}
                            </p>

                            {r.autorizacion_centrales_riesgo !== "presente" && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                                    Cláusula correctiva sugerida
                                  </p>
                                  <button
                                    onClick={() =>
                                      copiar(clausulaCorrectiva(r.titular), "Cláusula")
                                    }
                                    className="shrink-0 rounded-md border border-oxblood/30 bg-oxblood/5 px-2.5 py-1 text-xs font-medium text-oxblood transition hover:bg-oxblood/10"
                                  >
                                    Copiar
                                  </button>
                                </div>
                                <p className="mt-2 rounded-lg border border-oxblood/20 bg-oxblood/5 p-3 text-[13px] leading-relaxed text-ink-soft">
                                  {clausulaCorrectiva(r.titular)}
                                </p>
                                <p className="mt-1.5 text-[12px] text-ink-faint">
                                  Lista para insertar en el contrato y subsanar la autorización
                                  faltante.
                                </p>
                              </div>
                            )}

                            {r.error && (
                              <p className="mt-2 text-xs text-ausente">Error de proceso: {r.error}</p>
                            )}
                          </div>
                          <div>
                            <p className="font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                              Confianza
                            </p>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="font-display text-2xl text-ink tnum">
                                {Math.round(r.confianza * 100)}%
                              </span>
                            </div>
                            <div
                              className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-rule"
                              role="progressbar"
                              aria-valuenow={Math.round(r.confianza * 100)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className={`h-full rounded-full ${
                                  r.confianza >= 0.85
                                    ? "bg-conforme"
                                    : r.confianza >= 0.6
                                      ? "bg-ambiguo"
                                      : "bg-ausente"
                                }`}
                                style={{ width: `${Math.round(r.confianza * 100)}%` }}
                              />
                            </div>
                            <button
                              onClick={() => setRevisados((s) => ({ ...s, [r.id]: !s[r.id] }))}
                              className="mt-4 w-full rounded-lg border border-rule bg-paper px-3 py-2 text-xs font-medium text-ink hover:border-ink/40"
                            >
                              {revisado ? "Desmarcar revisión" : "Marcar como revisado"}
                            </button>
                            {r.autorizacion_centrales_riesgo !== "presente" && (
                              <button
                                onClick={() =>
                                  descargarPdf(
                                    { tipo: "oficio", registro: r },
                                    "oficio.pdf",
                                    `oficio-${r.id}`,
                                  )
                                }
                                disabled={descargando === `oficio-${r.id}`}
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-paper transition hover:bg-oxblood disabled:opacity-60"
                              >
                                {descargando === `oficio-${r.id}` && <Spinner />}
                                {descargando === `oficio-${r.id}`
                                  ? "Generando…"
                                  : "Generar oficio de autorización"}
                              </button>
                            )}
                            <p className="mt-4 break-all font-mono text-[12px] leading-relaxed text-ink-faint">
                              sha256 {r.hash_sha256}
                              <br />
                              {r.modelo}
                              {r.reverificado ? " · reverificado" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-rule">
        <p className="mx-auto w-full max-w-5xl px-5 py-6 text-[12px] leading-relaxed text-ink-faint sm:px-8">
          MVP de hackathon · La clasificación automática no sustituye el criterio jurídico. Todo
          documento ambiguo o sin autorización debe ser validado por un abogado antes de cualquier
          reporte a centrales de riesgo.
        </p>
      </footer>

      {/* Toasts */}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rise pointer-events-auto rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
              t.tipo === "error"
                ? "border-ausente/30 bg-ausente-bg text-ausente"
                : "border-conforme/30 bg-conforme-bg text-conforme"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, valor, tono }: { label: string; valor: number; tono: string }) {
  return (
    <div className="px-1 py-4 sm:px-5">
      <dd className={`font-display text-4xl leading-none tnum sm:text-5xl ${tono}`}>{valor}</dd>
      <dt className="mt-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
    </div>
  );
}

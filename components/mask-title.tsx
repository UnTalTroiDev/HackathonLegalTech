/**
 * Título que revela cada palabra subiendo desde detrás de una máscara (estilo saleads).
 * Solo CSS (clase .mask-word + keyframe maskRise en globals.css) — sin hooks, así que
 * sirve tanto en componentes de servidor como de cliente. Respeta prefers-reduced-motion.
 */
export function MaskTitle({
  text,
  className = "",
  stagger = 65,
}: {
  text: string;
  className?: string;
  stagger?: number;
}) {
  const words = text.split(" ");
  return (
    <h1 className={className} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={`${w}-${i}`}>
            <span className="mask-word">
              <span style={{ animationDelay: `${i * stagger}ms` }}>{w}</span>
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </h1>
  );
}

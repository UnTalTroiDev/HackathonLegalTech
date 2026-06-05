# Evaluación de exactitud

Mide la calidad del clasificador contra documentos **etiquetados por un abogado**.
Es el paso que convierte la demo en algo defendible: antes de confiar a escala, sabes
tu precisión/recall y, sobre todo, cuántos **falsos positivos peligrosos** comete
(un contrato sin autorización clasificado como "presente" → riesgo de reporte ilegal y
sanción de la SIC).

## Cómo usarlo

1. Coloca los PDFs de prueba en `eval/pdfs/`.
2. Crea `eval/casos.json` (copia `casos.example.json`) y etiqueta cada documento con el
   estado correcto de la autorización para centrales de riesgo:

   ```json
   [{ "archivo": "contrato_001.pdf", "esperado_centrales": "presente" }]
   ```

   Valores: `"presente" | "ambigua" | "ausente"`.
3. Configura `CEREBRAS_API_KEY` y/o `ANTHROPIC_API_KEY` en `.env.local`.
4. Ejecuta:

   ```bash
   npm run eval
   # o con otro set:
   npm run eval -- eval/otro.json
   ```

## Salida

- Resultado por documento (✓ / ✗).
- **Matriz de confusión** para centrales de riesgo.
- **Precisión y recall** por clase.
- **Exactitud global** y conteo de **falsos positivos peligrosos**.

> Recomendación: empieza con 10–15 documentos representativos (con texto, escaneados,
> ambiguos). Si el recall de "ausente" no es alto, sube todo a Claude o ajusta el umbral
> de re-verificación en `lib/analyze.ts`.

Los PDFs reales con datos personales **no deben subirse a control de versiones**
(`eval/pdfs/` está en `.gitignore`).

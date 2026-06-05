import { ImageResponse } from "next/og";

export const alt = "Legamio Audit · Due diligence de datos · Habeas Data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Og() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#fbfaf8",
          padding: "72px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "#0f766e",
              color: "#fbfaf8",
              fontSize: "26px",
              fontStyle: "italic",
            }}
          >
            LA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#1b1c1e", fontSize: "26px", fontWeight: 700, letterSpacing: "1px" }}>
              Legamio Audit
            </div>
            <div style={{ color: "#c2410c", fontSize: "17px", letterSpacing: "3px" }}>
              DEBIDA DILIGENCIA · PROTECCIÓN DE DATOS
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#1b1c1e", fontSize: "68px", lineHeight: 1.05 }}>
            Autorización de datos y reporte
          </div>
          <div style={{ color: "#1b1c1e", fontSize: "68px", lineHeight: 1.05 }}>
            a centrales de riesgo
          </div>
          <div style={{ color: "#4b4f54", fontSize: "28px", marginTop: "24px" }}>
            Revisión asistida por IA · cita textual y página · la IA prioriza, el abogado decide
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", color: "#0f766e", fontSize: "22px" }}>
          <div>Ley 1266/2008</div>
          <div style={{ color: "#8b8475" }}>·</div>
          <div>Ley 2157/2021</div>
          <div style={{ color: "#8b8475" }}>·</div>
          <div>Ley 1581/2012</div>
        </div>
      </div>
    ),
    size,
  );
}

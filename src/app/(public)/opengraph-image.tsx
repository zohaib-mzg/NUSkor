import { ImageResponse } from "next/og";

// Edge runtime sidesteps a Windows-only path bug in @vercel/og's Node runtime
// (fileURLToPath "Invalid URL") and also keeps image generation fast on Vercel.
export const runtime = "edge";

export const alt = "nuSkor — free CGPA calculator and student tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default Open Graph image for public pages (brand yellow, no university imagery). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5C518",
          color: "#111111",
          padding: 64,
        }}
      >
        <div style={{ fontSize: 100, fontWeight: 800, letterSpacing: -3 }}>
          nuSkor
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 42,
            fontWeight: 600,
            textAlign: "center",
            maxWidth: 920,
          }}
        >
          Free CGPA calculator and student tools
        </div>
        <div style={{ marginTop: 26, fontSize: 28, opacity: 0.7 }}>
          Independent · built by students
        </div>
      </div>
    ),
    { ...size }
  );
}

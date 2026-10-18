import { ImageResponse } from "next/og";
import blogIndex from "@/lib/blog-index.json";

// Edge runtime sidesteps a Windows-only path bug in @vercel/og's Node runtime
// (fileURLToPath "Invalid URL"). The index JSON is bundled, so no fs access.
export const runtime = "edge";

export const alt = "nuSkor guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return blogIndex.map((post) => ({ slug: post.slug }));
}

export default function OpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const post = blogIndex.find((p) => p.slug === params.slug);
  const title = post?.title ?? "Practical guides for students";
  const category = post?.category ?? "nuSkor blog";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F5C518",
          color: "#111111",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          <span>nuSkor</span>
          <span
            style={{
              background: "rgba(0,0,0,0.08)",
              borderRadius: 999,
              padding: "8px 22px",
              fontSize: 24,
            }}
          >
            {category}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? 50 : 58,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.65 }}>
          Free student guides — CGPA, GPA and study skills
        </div>
      </div>
    ),
    { ...size }
  );
}

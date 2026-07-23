import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

/** Default social-share card used when a page doesn't define its own. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE.name;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b0d12 0%, #181c26 100%)",
          color: "#eef1f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#6d7cff",
              color: "white",
              fontSize: 46,
              fontWeight: 700,
              borderRadius: 16,
            }}
          >
            D
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{SITE.name}</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          {SITE.tagline}
        </div>
        <div style={{ fontSize: 30, color: "#b8bfcf", marginTop: 28, maxWidth: 900 }}>
          Compress, convert, sign and write — all in your browser. Nothing uploaded.
        </div>
      </div>
    ),
    size,
  );
}

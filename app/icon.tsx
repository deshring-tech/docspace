import { ImageResponse } from "next/og";

/**
 * Generated favicon — the "D" mark on the brand accent. Generating it in code
 * keeps the brand in one place (no binary asset to regenerate on a rebrand).
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6d7cff",
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        D
      </div>
    ),
    size,
  );
}

import type { ReactElement } from "react";

/**
 * The app icon, described once and rendered at any size.
 *
 * Shared by the PWA icon routes so a rebrand is a single edit. Padding is
 * generous enough that the 512px version also works as a maskable icon
 * (safe-zone circles crop roughly 20% from each edge).
 */
export function renderAppIcon(size: number): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0d12",
      }}
    >
      <div
        style={{
          width: size * 0.62,
          height: size * 0.62,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6d7cff",
          color: "#ffffff",
          fontSize: size * 0.42,
          fontWeight: 700,
          borderRadius: size * 0.16,
        }}
      >
        D
      </div>
    </div>
  );
}

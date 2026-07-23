import { ImageResponse } from "next/og";
import { renderAppIcon } from "@/lib/pwaIcon";

/** 192px PWA icon, generated so the brand lives in code, not a binary. */
export function GET() {
  return new ImageResponse(renderAppIcon(192), { width: 192, height: 192 });
}

import { ImageResponse } from "next/og";
import { renderAppIcon } from "@/lib/pwaIcon";

/** 512px PWA icon (also used for the maskable variant). */
export function GET() {
  return new ImageResponse(renderAppIcon(512), { width: 512, height: 512 });
}

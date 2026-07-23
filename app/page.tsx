import { Workspace } from "@/components/workspace/Workspace";
import { ActionId } from "@/lib/types";

const VALID_ACTIONS: ActionId[] = [
  "compress",
  "pages",
  "merge",
  "split",
  "convert",
  "signature",
  "stamp",
  "ocr",
  "photo",
  "images-to-pdf",
];

/**
 * Home = the workspace. Landing pages deep-link here with ?action, ?preset
 * and ?maxkb so a visitor from "compress pdf to 200kb" arrives with the tool
 * already configured.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; preset?: string; maxkb?: string }>;
}) {
  const params = await searchParams;
  const action = VALID_ACTIONS.includes(params.action as ActionId)
    ? (params.action as ActionId)
    : undefined;
  const maxKb = params.maxkb ? parseInt(params.maxkb, 10) : undefined;

  return (
    <Workspace
      initialAction={action}
      initialPresetId={params.preset}
      initialMaxKb={Number.isFinite(maxKb) ? maxKb : undefined}
    />
  );
}

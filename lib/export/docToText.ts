/**
 * Rich document → HTML, Markdown and plain text. These three are simple
 * serializations, so they share one file.
 */
import { DocBlock, Run, blockText } from "@/lib/doc/model";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function runsToHtml(runs: Run[]): string {
  return runs
    .map((run) => {
      let html = escapeHtml(run.text).replace(/\n/g, "<br>");
      if (run.bold) html = `<strong>${html}</strong>`;
      if (run.italic) html = `<em>${html}</em>`;
      if (run.underline) html = `<u>${html}</u>`;
      return html;
    })
    .join("");
}

export function docToHtml(blocks: DocBlock[], title: string): string {
  const body: string[] = [];
  let listOpen: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listOpen) {
      body.push(`</${listOpen}>`);
      listOpen = null;
    }
  };

  for (const block of blocks) {
    if (block.type === "bullet" || block.type === "numbered") {
      const tag = block.type === "bullet" ? "ul" : "ol";
      if (listOpen !== tag) {
        closeList();
        body.push(`<${tag}>`);
        listOpen = tag;
      }
      body.push(`<li>${runsToHtml(block.runs)}</li>`);
      continue;
    }
    closeList();
    if (block.type === "heading") {
      body.push(`<h${block.level}>${runsToHtml(block.runs)}</h${block.level}>`);
    } else if (block.type === "image") {
      body.push(`<img src="${block.dataUrl}" alt="" style="max-width:320px">`);
    } else {
      body.push(`<p>${runsToHtml(block.runs)}</p>`);
    }
  }
  closeList();

  return [
    "<!doctype html>",
    `<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>`,
    "<style>body{font-family:Georgia,serif;max-width:720px;margin:48px auto;line-height:1.6;padding:0 24px;color:#1a1a1a}</style>",
    "</head><body>",
    ...body,
    "</body></html>",
  ].join("\n");
}

function runsToMarkdown(runs: Run[]): string {
  return runs
    .map((run) => {
      let text = run.text;
      if (run.bold && run.italic) text = `***${text}***`;
      else if (run.bold) text = `**${text}**`;
      else if (run.italic) text = `*${text}*`;
      return text;
    })
    .join("");
}

export function docToMarkdown(blocks: DocBlock[]): string {
  const lines: string[] = [];
  let numberedIndex = 0;
  for (const block of blocks) {
    if (block.type !== "numbered") numberedIndex = 0;
    switch (block.type) {
      case "heading":
        lines.push(`${"#".repeat(block.level)} ${runsToMarkdown(block.runs)}`, "");
        break;
      case "bullet":
        lines.push(`- ${runsToMarkdown(block.runs)}`);
        break;
      case "numbered":
        lines.push(`${++numberedIndex}. ${runsToMarkdown(block.runs)}`);
        break;
      case "image":
        lines.push(`![signature](${block.dataUrl})`, "");
        break;
      default:
        lines.push(runsToMarkdown(block.runs), "");
    }
  }
  return lines.join("\n");
}

export function docToPlainText(blocks: DocBlock[]): string {
  return blocks.map((block) => blockText(block)).join("\n");
}

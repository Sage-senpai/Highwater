// One-off extraction for M8: parses the NEMA 2022 flood xlsx (already
// unzipped to data/raw/nema_extract by `unzip`, since Node has no
// built-in zip reader) into a plain CSV of state, LGA, affected count.
// This is not part of the daily refresh. It ran once against a static
// 2022 dataset. See docs/BACKTEST.md for how the output was used.
import { readFileSync, writeFileSync } from "node:fs";

const SHARED_STRINGS_PATH = "data/raw/nema_extract/xl/sharedStrings.xml";
const SHEET_PATH = "data/raw/nema_extract/xl/worksheets/sheet2.xml";

function parseSharedStrings(xml: string): string[] {
  const items: string[] = [];
  const siBlocks = xml.match(/<si>.*?<\/si>/gs) ?? [];
  for (const block of siBlocks) {
    const text = [...block.matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((m) => m[1]).join("");
    items.push(
      text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    );
  }
  return items;
}

interface Row {
  state: string;
  lga: string;
  community: string;
  affected: string;
}

function main() {
  const shared = parseSharedStrings(readFileSync(SHARED_STRINGS_PATH, "utf-8"));
  const sheetXml = readFileSync(SHEET_PATH, "utf-8");

  const rowBlocks = sheetXml.match(/<row [^>]*>.*?<\/row>/gs) ?? [];
  const rows: Row[] = [];

  for (const rowXml of rowBlocks) {
    const cells = [...rowXml.matchAll(/<c r="([A-F])\d+"([^>]*)>(?:<v>(.*?)<\/v>)?<\/c>/gs)];
    const byCol: Record<string, string> = {};
    for (const [, col, attrs, value] of cells) {
      if (value === undefined) continue;
      const isShared = /\bt="s"/.test(attrs);
      byCol[col] = isShared ? shared[Number(value)] ?? "" : value;
    }
    if (byCol["A"] && byCol["B"]) {
      rows.push({
        state: byCol["A"],
        lga: byCol["B"],
        community: byCol["C"] ?? "",
        affected: byCol["E"] ?? "",
      });
    }
  }

  // Row 1 is the header row; drop it.
  const dataRows = rows.slice(1);

  const csvLines = ["state,lga,community,affected_count"];
  for (const r of dataRows) {
    csvLines.push(
      [r.state, r.lga, r.community, r.affected]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
  }
  writeFileSync("data/raw/nema_2022_lga.csv", csvLines.join("\n"));
  console.log(`Parsed ${dataRows.length} data rows from NEMA 2022 flood xlsx.`);

  const states = new Set(dataRows.map((r) => r.state));
  console.log(`States covered: ${states.size}`, [...states].sort());
}

main();

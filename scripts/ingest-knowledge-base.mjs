import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import officeParser from "officeparser";
import { embedTexts } from "./local-embeddings.mjs";

const require = createRequire(import.meta.url);
const legacyPpt = require("ppt-to-text");
const root = process.cwd();
const notesDir = path.join(root, "notes for process");
const dryRun = process.argv.includes("--dry-run");
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dimension = 384;

if (!dryRun && (!supabaseUrl || !serviceKey)) {
  throw new Error(
    "Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before ingesting.",
  );
}

function topicFor(filename) {
  const name = filename.toLowerCase();
  if (name.includes("scheduling")) return "Process Scheduling";
  if (name.includes("synchronization") || name.includes("critical") || name.includes("deadlock")) {
    return "Process Synchronization";
  }
  return "Processes and Operating Systems";
}

function collectText(node, out) {
  if (!node || typeof node !== "object") return;
  if (typeof node.text === "string" && node.text.trim()) {
    out.push({ text: node.text.trim(), heading: node.type === "heading" });
    return;
  }
  for (const child of node.children ?? []) collectText(child, out);
}

async function extractSlides(filename, buffer) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".ppt") {
    const presentation = legacyPpt.readBuffer(buffer);
    return legacyPpt.utils.to_text(presentation).map((text, index) => ({
      page: index + 1,
      blocks: [{ text: String(text ?? "").trim(), heading: false }].filter((block) => block.text),
    }));
  }

  if (extension === ".txt" || extension === ".md") {
    return buffer
      .toString("utf8")
      .split("\f")
      .map((text, index) => ({
        page: index + 1,
        blocks: text
          .split(/\n{2,}/)
          .map((part) => ({ text: part.trim(), heading: false }))
          .filter((part) => part.text),
      }));
  }

  const fileTypes = { ".pptx": "pptx", ".pdf": "pdf", ".docx": "docx" };
  const fileType = fileTypes[extension];
  if (!fileType) throw new Error(`Unsupported file format: ${filename}`);
  const ast = await officeParser.parseOffice(buffer, { fileType });
  const pageNodes = (ast.content ?? []).filter(
    (node) => node.type === "slide" || node.type === "page",
  );
  const pages = pageNodes.length ? pageNodes : [{ children: ast.content ?? [], metadata: {} }];
  return pages.map((slide, index) => {
    const blocks = [];
    for (const child of slide.children ?? []) collectText(child, blocks);
    return { page: slide.metadata?.slideNumber ?? index + 1, blocks };
  });
}

function splitLongText(text, size = 850, overlap = 120) {
  const paragraphs = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > size) {
      if (current) chunks.push(current);
      current = "";
      let start = 0;
      while (start < paragraph.length) {
        const end = Math.min(start + size, paragraph.length);
        chunks.push(paragraph.slice(start, end).trim());
        if (end === paragraph.length) break;
        start = end - overlap;
      }
      continue;
    }
    if (current && current.length + paragraph.length + 1 > size) {
      chunks.push(current);
      const tail = current.slice(-overlap);
      current = `${tail} ${paragraph}`.trim();
    } else {
      current = current ? `${current}\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function supabaseRequest(resource, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${resource}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  return response.status === 204 ? null : response.json();
}

const entries = (await readdir(notesDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(pptx?|pdf|docx|txt|md)$/i.test(entry.name))
  .sort((a, b) => a.name.localeCompare(b.name));
if (!entries.length) throw new Error(`No supported documents found in ${notesDir}.`);

let indexed = 0;
let skipped = 0;
for (const entry of entries) {
  const filename = entry.name;
  const buffer = await readFile(path.join(notesDir, filename));
  if (!buffer.length) {
    console.warn(`Skipped empty document: ${filename}`);
    skipped++;
    continue;
  }
  // Include the filename so identical course files under different names keep
  // independent source metadata and are not replaced as the same document.
  const documentHash = createHash("sha256")
    .update(filename)
    .update("\0")
    .update(buffer)
    .digest("hex");
  let slides;
  try {
    slides = await extractSlides(filename, buffer);
  } catch (error) {
    console.warn(
      `Skipped unreadable document ${filename}: ${error instanceof Error ? error.message : "parse error"}`,
    );
    skipped++;
    continue;
  }
  let section = "";
  const chunks = [];
  for (const slide of slides) {
    const headings = slide.blocks.filter((block) => block.heading).map((block) => block.text);
    if (headings.length) section = headings.at(-1).replace(/\s+/g, " ").slice(0, 180);
    const pageText = slide.blocks.map((block) => block.text).join("\n");
    for (const content of splitLongText(pageText)) {
      chunks.push({
        document_hash: documentHash,
        filename,
        page_number: slide.page,
        topic: topicFor(filename),
        section: section || null,
        content,
      });
    }
  }
  if (!chunks.length) {
    console.warn(`No readable text found: ${filename}`);
    continue;
  }
  if (dryRun) {
    console.log(`Parsed ${filename}: ${chunks.length} chunks from ${slides.length} slides/pages`);
    indexed++;
    continue;
  }

  const existing = await supabaseRequest(
    `knowledge_chunks?document_hash=eq.${documentHash}&filename=eq.${encodeURIComponent(filename)}&select=id&limit=1`,
  );
  if (existing.length) {
    console.log(`Skipped unchanged: ${filename}`);
    skipped++;
    continue;
  }

  const vectors = [];
  for (let offset = 0; offset < chunks.length; offset += 8) {
    vectors.push(
      ...(await embedTexts(chunks.slice(offset, offset + 8).map((chunk) => chunk.content))),
    );
  }
  const records = chunks.map((chunk, index) => ({
    ...chunk,
    chunk_index: index,
    embedding: vectors[index],
  }));

  const indexedCount = await supabaseRequest("rpc/replace_knowledge_document", {
    method: "POST",
    body: JSON.stringify({
      document_filename: filename,
      document_hash_value: documentHash,
      document_chunks: records,
    }),
  });
  console.log(`Indexed ${filename}: ${indexedCount} chunks from ${slides.length} slides/pages`);
  indexed++;
}

console.log(`Knowledge base updated. Indexed ${indexed}; skipped unchanged ${skipped}.`);

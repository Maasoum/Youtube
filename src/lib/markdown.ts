import type { BlogPostSection } from "@/api/types";

export type MarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }
  | { kind: "divider" };

export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; value: string; href: string };

const orderedItemPattern = /^\d+[.)]\s+/;
const unorderedItemPattern = /^[-*•]\s+/;

/**
 * تحلیل‌گر Markdown ساده و امن برای ویرایشگر پنل.
 * خروجی داده است، نه HTML؛ بنابراین هیچ ورودی‌ای اجرا نمی‌شود.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  };

  const flushList = () => {
    if (list && list.items.length > 0) {
      blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (code !== null) {
      if (line.trim().startsWith("```")) {
        blocks.push({ kind: "code", text: code.join("\n") });
        code = null;
      } else {
        code.push(rawLine);
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      code = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "divider" });
      continue;
    }

    const quoteMatch = /^>\s?(.*)$/.exec(line.trim());
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "quote", text: quoteMatch[1].trim() });
      continue;
    }

    const ordered = orderedItemPattern.test(line.trim());
    const unordered = unorderedItemPattern.test(line.trim());
    if (ordered || unordered) {
      flushParagraph();
      const item = line.trim().replace(
        ordered ? orderedItemPattern : unorderedItemPattern,
        "",
      );
      if (list && list.ordered !== ordered) {
        flushList();
      }
      if (!list) list = { ordered, items: [] };
      list.items.push(item.trim());
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (code !== null) {
    blocks.push({ kind: "code", text: code.join("\n") });
  }
  flushParagraph();
  flushList();

  return blocks;
}

/** تحلیل متن درون‌خطی؛ ایتالیک عمداً پشتیبانی نمی‌شود تا متن فارسی ایتالیک نشود. */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("**")) {
      tokens.push({ kind: "bold", value: raw.slice(2, -2) });
    } else if (raw.startsWith("`")) {
      tokens.push({ kind: "code", value: raw.slice(1, -1) });
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
      if (linkMatch) {
        tokens.push({ kind: "link", value: linkMatch[1], href: linkMatch[2] });
      } else {
        tokens.push({ kind: "text", value: raw });
      }
    }
    lastIndex = match.index + raw.length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return tokens.length > 0 ? tokens : [{ kind: "text", value: text }];
}

/**
 * تبدیل Markdown به بخش‌های مقاله‌ی سایت.
 * هر تیتر سطح دو (`## ...`) یک بخش می‌سازد؛ پاراگراف‌ها با خط خالی جدا می‌شوند.
 */
export function markdownToSections(markdown: string): BlogPostSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: BlogPostSection[] = [];
  let heading = "";
  let paragraphs: string[] = [];
  let buffer: string[] = [];

  const flushParagraph = () => {
    const text = buffer
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ");
    if (text) paragraphs.push(text);
    buffer = [];
  };

  const flushSection = () => {
    flushParagraph();
    if (heading || paragraphs.length > 0) {
      sections.push({
        heading: heading || "مقدمه",
        paragraphs: paragraphs.length > 0 ? paragraphs : [""],
      });
    }
    heading = "";
    paragraphs = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const match = /^##\s+(.+)$/.exec(trimmed);
    if (match) {
      flushSection();
      heading = match[1].trim();
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      buffer.push(trimmed.replace(/^[-*•]\s+/, "• "));
      continue;
    }
    buffer.push(trimmed);
  }

  flushSection();
  return sections.filter(
    (section) => section.heading.trim() !== "" && section.paragraphs.length > 0,
  );
}

/** تبدیل بخش‌های مقاله به Markdown قابل ویرایش. */
export function sectionsToMarkdown(sections: BlogPostSection[]): string {
  return sections
    .map(
      (section) =>
        `## ${section.heading}\n\n${section.paragraphs.join("\n\n")}`,
    )
    .join("\n\n");
}

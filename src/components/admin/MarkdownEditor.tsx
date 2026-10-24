import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  List,
  PencilLine,
  Quote,
} from "lucide-react";
import {
  parseInline,
  parseMarkdown,
  type InlineToken,
  type MarkdownBlock,
} from "@/lib/markdown";
import { cn } from "@/lib/cn";

function inlineNodes(tokens: InlineToken[]): ReactNode[] {
  return tokens.map((token, index) => {
    if (token.kind === "bold") {
      return <strong key={index} className="font-bold text-ink">{token.value}</strong>;
    }
    if (token.kind === "code") {
      return (
        <code
          key={index}
          dir="ltr"
          className="rounded-md bg-surface-soft px-1.5 py-0.5 font-mono text-[0.85em] text-primary"
        >
          {token.value}
        </code>
      );
    }
    if (token.kind === "link") {
      const safe = /^(https:\/\/|\/|#)/.test(token.href);
      return safe ? (
        <a
          key={index}
          href={token.href}
          className="font-bold text-primary underline decoration-primary/30 underline-offset-4"
          {...(token.href.startsWith("https://")
            ? { target: "_blank", rel: "noreferrer noopener" }
            : {})}
        >
          {token.value}
        </a>
      ) : (
        <span key={index}>{token.value}</span>
      );
    }
    return <span key={index}>{token.value}</span>;
  });
}

function Inline({ text }: { text: string }) {
  return <>{inlineNodes(parseInline(text))}</>;
}

function BlockView({
  block,
  headingId,
}: {
  block: MarkdownBlock;
  headingId?: string;
}) {
  if (block.kind === "heading") {
    const className =
      block.level === 1
        ? "mt-5 text-2xl font-bold leading-9 text-ink"
        : block.level === 2
          ? "mt-5 text-xl font-bold leading-8 text-ink"
          : "mt-4 text-lg font-bold leading-8 text-ink";
    if (block.level === 1)
      return (
        <h2 id={headingId} className={className}>
          <Inline text={block.text} />
        </h2>
      );
    if (block.level === 2)
      return (
        <h3 id={headingId} className={className}>
          <Inline text={block.text} />
        </h3>
      );
    return (
      <h4 id={headingId} className={className}>
        <Inline text={block.text} />
      </h4>
    );
  }
  if (block.kind === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag
        className={cn(
          "my-3 space-y-1.5 ps-5 text-sm leading-7 text-ink/85",
          block.ordered ? "list-decimal" : "list-disc",
        )}
      >
        {block.items.map((item, index) => (
          <li key={index}><Inline text={item} /></li>
        ))}
      </ListTag>
    );
  }
  if (block.kind === "quote") {
    return (
      <blockquote className="my-4 rounded-e-2xl border-s-4 border-primary/30 bg-primary-soft/10 px-4 py-2 text-sm leading-7 text-muted">
        <Inline text={block.text} />
      </blockquote>
    );
  }
  if (block.kind === "code") {
    return (
      <pre
        dir="ltr"
        className="my-4 overflow-x-auto rounded-2xl bg-ink p-4 text-start font-mono text-xs leading-6 text-white/85"
      >
        <code>{block.text}</code>
      </pre>
    );
  }
  if (block.kind === "divider") {
    return <hr className="my-5 border-black/10" />;
  }
  return (
    <p className="my-2.5 text-sm leading-8 text-ink/80">
      <Inline text={block.text} />
    </p>
  );
}

export function MarkdownPreview({
  value,
  headingIdPrefix,
  className = "rounded-2xl border border-black/5 bg-white p-4 sm:p-5",
}: {
  value: string;
  headingIdPrefix?: string;
  className?: string;
}) {
  const blocks = useMemo(() => parseMarkdown(value), [value]);
  if (!value.trim()) {
    return (
      <p className="rounded-2xl border border-dashed border-black/10 bg-surface-soft/40 p-6 text-center text-xs text-muted">
        پیش‌نمایش پس از نوشتن متن نمایش داده می‌شود.
      </p>
    );
  }
  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <BlockView
          key={index}
          block={block}
          headingId={
            headingIdPrefix ? `${headingIdPrefix}-${index}` : undefined
          }
        />
      ))}
    </div>
  );
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  hint?: string;
}

const tools = [
  { id: "heading", label: "تیتر", icon: Heading2, prefix: "## ", suffix: "" },
  { id: "bold", label: "درشت", icon: Bold, prefix: "**", suffix: "**" },
  { id: "list", label: "فهرست", icon: List, prefix: "- ", suffix: "" },
  { id: "quote", label: "نقل‌قول", icon: Quote, prefix: "> ", suffix: "" },
  { id: "code", label: "کد", icon: Code2, prefix: "`", suffix: "`" },
] as const;

export function MarkdownEditor({
  value,
  onChange,
  error,
  label = "متن مقاله (Markdown)",
  hint,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageId = "markdown-editor-message";

  const insert = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${prefix}${suffix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    onChange(next);
    window.setTimeout(() => {
      textarea.focus();
      const cursor = start + prefix.length + selected.length;
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="markdown-editor" className="label-base mb-0">
          {label}
          <span className="ms-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <div
          role="tablist"
          aria-label="حالت ویرایش متن"
          className="inline-flex rounded-full border border-black/5 bg-surface-soft p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            onClick={() => setMode("edit")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              mode === "edit" ? "bg-white text-primary shadow-sm" : "text-muted",
            )}
          >
            <PencilLine className="size-3.5" aria-hidden="true" />
            نوشتن
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            onClick={() => setMode("preview")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              mode === "preview" ? "bg-white text-primary shadow-sm" : "text-muted",
            )}
          >
            <Eye className="size-3.5" aria-hidden="true" />
            پیش‌نمایش
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div
          role="toolbar"
          aria-label="ابزارهای قالب‌بندی Markdown"
          className="flex flex-wrap items-center gap-1 border-b border-black/5 bg-surface-soft/50 p-2"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => insert(tool.prefix, tool.suffix)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold text-muted transition hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                aria-label={tool.label}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {tool.label}
              </button>
            );
          })}
          <span className="ms-auto hidden text-[10px] text-muted/70 sm:inline">
            تیتر سطح دو (##) هر بخش مقاله را می‌سازد.
          </span>
        </div>

        {mode === "edit" ? (
          <textarea
            ref={textareaRef}
            id="markdown-editor"
            dir="rtl"
            rows={18}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            placeholder={"## یک تیتر روشن\n\nمتن پاراگراف را اینجا بنویسید. برای فهرست از - و برای نقل‌قول از > استفاده کنید."}
            className="min-h-[26rem] w-full resize-y border-0 bg-white px-4 py-4 text-sm leading-8 text-ink outline-none placeholder:text-muted/50 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/15"
          />
        ) : (
          <div className="max-h-[32rem] overflow-y-auto bg-surface-soft/30 p-3">
            <MarkdownPreview value={value} />
          </div>
        )}
      </div>

      {error ? (
        <p id={messageId} role="alert" className="mt-2 text-xs font-bold leading-6 text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-2 text-xs leading-6 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

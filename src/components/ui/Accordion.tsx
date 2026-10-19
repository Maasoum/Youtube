import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: number | null;
  className?: string;
  tone?: "light" | "dark";
}

export function Accordion({
  items,
  defaultOpen = null,
  className,
  tone = "light",
}: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div className={cn("divide-y", tone === "light" ? "divide-black/10" : "divide-white/20", className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const buttonId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;

        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 py-5 text-start text-sm font-bold transition sm:text-base",
                  tone === "light"
                    ? "text-ink hover:text-primary"
                    : "text-white hover:text-accent",
                )}
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300",
                    tone === "light"
                      ? "bg-surface-soft text-primary"
                      : "bg-white/15 text-white",
                    isOpen && "rotate-180",
                  )}
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p
                    className={cn(
                      "pb-6 pe-2 text-sm leading-8 sm:text-base",
                      tone === "light" ? "text-muted" : "text-white/75",
                    )}
                  >
                    {item.answer}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

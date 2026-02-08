/**
 * MindMosaic — Prompt Block Renderer
 *
 * Renders structured prompt blocks from exam questions.
 * Supports: text, heading, list, quote, instruction
 */

import type { PromptBlock } from "../types/exam.types";

interface PromptBlockRendererProps {
  blocks: PromptBlock[];
}

export function PromptBlockRenderer({ blocks }: PromptBlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <BlockRenderer key={index} block={block} />
      ))}
    </div>
  );
}

interface BlockRendererProps {
  block: PromptBlock;
}

function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "text":
      return <TextBlockRenderer content={block.content} />;

    case "heading":
      return <HeadingBlockRenderer level={block.level} content={block.content} />;

    case "list":
      return <ListBlockRenderer ordered={block.ordered} items={block.items} />;

    case "quote":
      return (
        <QuoteBlockRenderer
          content={block.content}
          attribution={block.attribution}
        />
      );

    case "instruction":
      return <InstructionBlockRenderer content={block.content} />;

    default:
      // Handle unknown block types gracefully
      console.warn("Unknown prompt block type:", (block as { type: string }).type);
      return null;
  }
}

// =============================================================================
// Individual Block Renderers
// =============================================================================

function TextBlockRenderer({ content }: { content: string }) {
  return (
    <p className="text-text-primary leading-relaxed text-base">
      {content}
    </p>
  );
}

function HeadingBlockRenderer({
  level,
  content,
}: {
  level: 1 | 2 | 3;
  content: string;
}) {
  const baseClasses = "font-semibold text-text-primary";

  switch (level) {
    case 1:
      return <h1 className={`${baseClasses} text-2xl mb-2`}>{content}</h1>;
    case 2:
      return <h2 className={`${baseClasses} text-xl mb-2`}>{content}</h2>;
    case 3:
      return <h3 className={`${baseClasses} text-lg mb-1`}>{content}</h3>;
    default:
      return <h3 className={`${baseClasses} text-lg mb-1`}>{content}</h3>;
  }
}

function ListBlockRenderer({
  ordered,
  items,
}: {
  ordered: boolean;
  items: string[];
}) {
  const ListTag = ordered ? "ol" : "ul";
  const listClasses = ordered
    ? "list-decimal list-inside space-y-1"
    : "list-disc list-inside space-y-1";

  return (
    <ListTag className={`${listClasses} text-text-primary pl-2`}>
      {items.map((item, index) => (
        <li key={index} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ListTag>
  );
}

function QuoteBlockRenderer({
  content,
  attribution,
}: {
  content: string;
  attribution?: string;
}) {
  return (
    <blockquote className="border-l-4 border-primary-blue pl-4 py-2 bg-background-soft rounded-r">
      <p className="text-text-primary italic leading-relaxed">{content}</p>
      {attribution && (
        <footer className="mt-2 text-text-muted text-sm">
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}

function InstructionBlockRenderer({ content }: { content: string }) {
  return (
    <div className="bg-amber-50 border border-accent-amber rounded-md p-3">
      <p className="text-text-primary text-sm flex items-start gap-2">
        <span className="text-accent-amber font-medium shrink-0">📝</span>
        <span>{content}</span>
      </p>
    </div>
  );
}

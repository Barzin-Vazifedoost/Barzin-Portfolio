import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { slugify } from "@/lib/slugify";

/** Flattens a heading's children down to plain text so it can be turned into an id. */
function toText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in node) {
    return toText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

type HeadingProps = ComponentPropsWithoutRef<"h2">;
type AnchorProps = ComponentPropsWithoutRef<"a">;

const HEADING_CLASS: Record<"h2" | "h3" | "h4", string> = {
  h2: "display mt-16 mb-5 text-[length:calc(var(--step-title)*1.25)] font-medium text-[var(--core)] scroll-mt-24",
  h3: "display mt-12 mb-4 text-[length:var(--step-title)] font-medium scroll-mt-24",
  h4: "eyebrow mt-10 mb-3 text-[var(--text-dim)] scroll-mt-24",
};

/**
 * Headings carry an id derived from their text, so every section is linkable.
 * The anchor itself only appears on hover, to keep the reading column clean.
 */
function heading(Tag: "h2" | "h3" | "h4") {
  const Heading = ({ children, id, ...props }: HeadingProps) => {
    const anchor = id ?? slugify(toText(children));
    return (
      <Tag id={anchor} className={`group ${HEADING_CLASS[Tag]}`} {...props}>
        <a href={`#${anchor}`} className="no-underline">
          {children}
          <span
            aria-hidden="true"
            className="ml-3 text-[var(--mid)] opacity-0 transition-opacity duration-300 ease-[var(--ease-flow)] group-hover:opacity-100"
          >
            #
          </span>
        </a>
      </Tag>
    );
  };
  Heading.displayName = `Mdx${Tag.toUpperCase()}`;
  return Heading;
}

/**
 * Component overrides applied to every MDX document: heading anchors, correct
 * link handling, and the reading styles for the prose column.
 */
export const mdxComponents = {
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),

  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="my-5 leading-[1.75] text-[var(--text-dim)]" {...props} />
  ),

  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="my-5 flex flex-col gap-2.5" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="my-5 flex list-decimal flex-col gap-2.5 pl-5 marker:text-[var(--mid)]" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li
      className="relative pl-5 text-[var(--text-dim)] before:absolute before:left-0 before:top-[0.72em] before:block before:h-1 before:w-1 before:rounded-full before:bg-[var(--mid)] [ol>&]:pl-0 [ol>&]:before:hidden"
      {...props}
    />
  ),

  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="my-8 border-l-2 border-[var(--mid)] pl-6 italic text-[var(--text)]"
      {...props}
    />
  ),

  hr: () => <hr className="my-14 border-0 border-t border-[var(--deep)]/60" />,

  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-[var(--text)]" {...props} />
  ),

  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      className="rounded bg-[var(--deep)]/40 px-1.5 py-0.5 font-mono text-[0.86em] text-[var(--core)]"
      {...props}
    />
  ),

  // Block code: the <pre> owns the scroll container so long lines never widen
  // the page, and the inner <code> drops the inline pill styling.
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="my-8 overflow-x-auto rounded-sm border border-[var(--deep)]/70 bg-[#040604] p-5 font-mono text-[0.82rem] leading-relaxed text-[var(--text-dim)] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      {...props}
    />
  ),

  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-left" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      className="eyebrow border-b border-[var(--deep)] px-3 py-2 text-[var(--text-faint)]"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border-b border-[var(--deep)]/40 px-3 py-2 text-[var(--text-dim)]" {...props} />
  ),

  img: (props: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="my-8 h-auto max-w-full rounded-sm" alt="" {...props} />
  ),

  a: ({ href = "", children, ...props }: AnchorProps) => {
    const className =
      "text-[var(--core)] underline decoration-[var(--mid)] underline-offset-[3px] transition-colors duration-300 ease-[var(--ease-flow)] hover:decoration-[var(--neon)] hover:text-[var(--neon)]";
    const isInternal = href.startsWith("/") || href.startsWith("#");

    if (isInternal) {
      return (
        <Link href={href} className={className} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
        {children}
      </a>
    );
  },
};

/** Renders an MDX body string on the server. */
export function Mdx({ source }: { source: string }) {
  return (
    <div className="text-[length:var(--step-body)]">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{ parseFrontmatter: false }}
      />
    </div>
  );
}

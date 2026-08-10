import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The quiet mono link, with an underline that draws itself on hover.
 *
 * This markup — an `.eyebrow` anchor wrapping a `scale-x-0 → scale-x-100`
 * underline span — was hand-copied into seven files, so changing the link
 * treatment meant editing seven files. It was already exported from
 * `page-shell.tsx` and imported by none of them, because that version rendered
 * a plain `<a>`: following one would have been a full document load, and the
 * canopy lives in the root layout now, so a document load replants the tree
 * the navigation is supposed to move the camera through.
 *
 * So internal hrefs go through `next/link` and only genuinely external ones
 * get an `<a>`, which is what makes the component usable in the places that
 * were working around it.
 */
export default function QuietLink({
  href,
  children,
  external,
  className = "",
}: {
  href: string;
  children: ReactNode;
  /** Defaults to whatever the href looks like; pass it to override. */
  external?: boolean;
  className?: string;
}) {
  const internal = href.startsWith("/") || href.startsWith("#");
  /**
   * `mailto:` and `tel:` are neither: they hand off to another application, so
   * they want a plain anchor but emphatically not `target="_blank"`, which
   * leaves an empty tab behind once the mail client takes over.
   */
  const handoff = /^[a-z]+:/i.test(href) && !/^https?:/i.test(href);
  const isExternal = external ?? (!internal && !handoff);

  const classes =
    "eyebrow group/link relative inline-block text-[var(--label)] transition-colors duration-500 ease-[var(--ease-flow)] hover:text-[var(--neon)]" +
    (className ? ` ${className}` : "");

  const underline = (
    <span
      aria-hidden="true"
      className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--neon)] transition-transform duration-500 ease-[var(--ease-flow)] group-hover/link:scale-x-100"
    />
  );

  if (internal) {
    return (
      <Link href={href} className={classes}>
        {children}
        {underline}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={classes}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {underline}
    </a>
  );
}

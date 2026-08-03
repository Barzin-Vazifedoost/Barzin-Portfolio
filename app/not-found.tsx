import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/projects", label: "Projects" },
    { href: "/blog", label: "Writing" },
    { href: "/resume", label: "Resume" },
  ];

  return (
    <PageShell
      eyebrow="404"
      title="Nothing grew here"
      lead="That page does not exist, or it may have moved."
      aside="Not found"
    >
      <ul className="border-l border-[var(--deep)]/60">
        {links.map((link) => (
          <li key={link.href} className="group relative">
            <Link
              href={link.href}
              className="block py-6 pl-8 transition-colors duration-500 ease-[var(--ease-flow)] hover:bg-[var(--mid)]/[0.04]"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-[32px] block h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--mid)] transition-all duration-500 ease-[var(--ease-flow)] group-hover:bg-[var(--neon)] group-hover:shadow-[0_0_14px_var(--neon)]"
              />
              <span className="display text-[length:var(--step-title)] transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]">
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

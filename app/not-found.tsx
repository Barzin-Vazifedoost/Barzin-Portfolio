import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Reveal } from "@/components/reveal";
import { Spotlight } from "@/components/spotlight";

export default function NotFound() {
  const links = [
    { href: "/", label: "Home", hint: "Back to the start" },
    { href: "/projects", label: "Projects", hint: "Case studies and selected work" },
    { href: "/blog", label: "Writing", hint: "Notes and long-form posts" },
    { href: "/resume", label: "Resume", hint: "Experience, education, skills" },
  ];

  return (
    <PageShell
      eyebrow="404"
      title="Nothing grew here"
      lead="That page does not exist, or it may have moved. These do exist."
      aside="Not found"
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {links.map((link, index) => (
          <Reveal as="li" key={link.href} delay={index * 0.06} className="flex">
            <Spotlight className="group surface w-full">
              <Link
                href={link.href}
                className="flex h-full items-center gap-4 p-6"
              >
                <span aria-hidden="true" className="node shrink-0" />
                <span className="min-w-0">
                  <span className="display block text-[length:var(--step-title)] transition-colors duration-500 ease-[var(--ease-flow)] group-hover:text-[var(--core)]">
                    {link.label}
                  </span>
                  <span className="meta mt-1.5 block">{link.hint}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="ml-auto shrink-0 text-[var(--mid)] transition-all duration-500 ease-[var(--ease-flow)] group-hover:translate-x-1 group-hover:text-[var(--neon)]"
                >
                  →
                </span>
              </Link>
            </Spotlight>
          </Reveal>
        ))}
      </ul>
    </PageShell>
  );
}

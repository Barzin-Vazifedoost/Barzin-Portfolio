import { absoluteUrl, site } from "@/lib/site";

/**
 * Structured data.
 *
 * The site had none, so a search engine had to infer from prose that these
 * pages are a person, their writing and their work. `Person` on the home page
 * and `BlogPosting` on each post is the cheap, material version of telling it
 * directly.
 *
 * Rendered as a `<script type="application/ld+json">`, which is inert: the
 * browser never parses it as JavaScript. `JSON.stringify` output still gets its
 * `<` escaped, because a `</script>` inside any string value would otherwise
 * close the tag early.
 */

function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function PersonJsonLd() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name: site.name,
        description: site.description,
        url: site.url,
        email: `mailto:${site.email}`,
        jobTitle: site.tagline,
        sameAs: site.socials.map((social) => social.href),
      }}
    />
  );
}

export function BlogPostingJsonLd({
  title,
  description,
  slug,
  published,
  modified,
  tags,
}: {
  title: string;
  description: string;
  slug: string;
  published: Date;
  modified?: Date;
  tags?: readonly string[];
}) {
  const url = absoluteUrl(`/blog/${slug}`);

  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        url,
        mainEntityOfPage: url,
        datePublished: published.toISOString(),
        dateModified: (modified ?? published).toISOString(),
        author: { "@type": "Person", name: site.name, url: site.url },
        ...(tags && tags.length > 0 ? { keywords: tags.join(", ") } : {}),
      }}
    />
  );
}

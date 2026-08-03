import type { Resume } from "@/lib/content/schemas";

/**
 * TODO: replace the placeholder entries below with your real history.
 * Dates are `YYYY-MM`; omit `end` for a current role.
 */
export const resume: Resume = {
  headline: "Software Engineer",
  summary:
    "TODO: two or three sentences covering what you build, the domains you have worked in, and what you are looking for next.",
  location: "TODO: City, Country",
  // Drop the file in `public/` and point at it here to enable the download link.
  pdfPath: undefined,

  experience: [
    {
      company: "TODO Company",
      role: "TODO Role",
      start: "2024-01",
      location: "TODO: City / Remote",
      summary: "TODO: one line on the team and your remit.",
      highlights: [
        "TODO: an outcome with a number attached.",
        "TODO: something you built end to end.",
      ],
      stack: ["TypeScript", "React"],
    },
    {
      company: "TODO Previous Company",
      role: "TODO Role",
      start: "2022-06",
      end: "2023-12",
      location: "TODO: City / Remote",
      highlights: ["TODO: an outcome with a number attached."],
      stack: ["TODO"],
    },
  ],

  education: [
    {
      institution: "TODO University",
      credential: "TODO Degree",
      start: "2018-09",
      end: "2022-05",
      location: "TODO: City, Country",
    },
  ],

  skills: [
    { category: "Languages", items: ["TypeScript", "JavaScript"] },
    { category: "Frameworks", items: ["React", "Next.js"] },
    { category: "Infrastructure", items: ["TODO"] },
  ],
};

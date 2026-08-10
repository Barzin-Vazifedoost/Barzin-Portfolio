"use client";

import { useSyncExternalStore } from "react";

/**
 * The current year, read on the client.
 *
 * Every page here is prerendered, so a `new Date().getFullYear()` in the footer
 * baked the *build* year into the HTML and showed it until the next deploy — a
 * site built in December reads as a year out of date by January.
 *
 * `useSyncExternalStore` is the pattern for a value that genuinely differs
 * between server and client: it takes both snapshots explicitly, so the server
 * renders the build year (the footer is never blank and never shifts width) and
 * the client replaces it with the reader's own year on hydration. Doing this
 * with `useState` + `useEffect` would work too, but it sets state inside an
 * effect purely to correct the first render, which is the cascading-render
 * pattern React 19 warns about.
 */

/** The year never changes mid-session, so there is nothing to subscribe to. */
const subscribe = () => () => {};

const clientYear = () => new Date().getFullYear();

/** Evaluated once, when the module is first loaded on the server: build time. */
const buildYear = new Date().getFullYear();
const serverYear = () => buildYear;

export default function SiteYear() {
  const year = useSyncExternalStore(subscribe, clientYear, serverYear);
  return <span suppressHydrationWarning>{year}</span>;
}

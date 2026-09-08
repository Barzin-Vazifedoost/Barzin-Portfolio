/**
 * The numeric kit shared by the tree modules. Pure, dependency-free, and safe
 * on either side of the server/client boundary.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** mulberry32 — deterministic per seed, so the same seed grows the same tree. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a over the parts. Turns a content set into a seed, which is what lets
 * the tree be derived from what has been published rather than from chance:
 * the same slugs always produce the same tree, for every visitor and every
 * screenshot, while publishing something new reshapes it.
 *
 * Order-sensitive on purpose — callers sort first if they want the shape to
 * survive a directory listing coming back in a different order.
 */
export function hashSeed(parts: readonly string[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash ^= part.charCodeAt(i);
      // 16777619, as a shift/add chain so the whole thing stays in 32 bits.
      hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
    }
    // Separator, so ["ab","c"] and ["a","bc"] do not collide.
    hash = (hash ^ 0x2f) >>> 0;
  }
  return hash >>> 0;
}

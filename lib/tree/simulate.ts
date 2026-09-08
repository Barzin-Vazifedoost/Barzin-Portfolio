/**
 * Everything the tree does over time: unfurling, wind, data pulses, spores and
 * sparks. Operates on a `TreeTopology` and knows nothing about canvases —
 * `solve()` leaves world-space endpoints on each branch and the renderer reads
 * them.
 *
 * All randomness here runs through a seeded generator, so a settled tree is
 * identical everywhere. That matters for the reduced-motion path, which draws
 * a single fast-forwarded frame and never animates.
 */

import { clamp, createRng, easeOut } from "./math";
import { MOBILE_BREAKPOINT, type TreeBranch, type TreeTopology } from "./build";

export const MOTION = {
  // ── Growth ───────────────────────────────────────────────────────────────
  /** Seconds for the deepest chain to unfurl at `speed = 1`. */
  growthSeconds: 5.5,
  /** A branch spawns its children once its own progress crosses this. */
  spawnThreshold: 0.62,

  // ── Wind ─────────────────────────────────────────────────────────────────
  windSpeed: 0.55,
  /** Radians of sway at the tips, accumulated down the chain. */
  windAmount: 0.055,

  // ── Gusts ────────────────────────────────────────────────────────────────
  /** A one-off impulse — a click, a hard scroll — that rolls through the
   *  canopy and settles. Signed, so it can blow either way. */
  gustAmount: 0.19,
  gustFrequency: 2.6,
  gustDecaySeconds: 1.05,

  // ── Data pulses ──────────────────────────────────────────────────────────
  pulseIntervalSeconds: 0.42,
  pulsePixelsPerSecond: 210,
  maxPulses: 64,
  /** Pulses injected per hover surge. */
  surgePulses: 5,

  // ── Particles ────────────────────────────────────────────────────────────
  sporesPerMegapixel: 46,
  maxSpores: 120,
  sporeRisePixelsPerSecond: 14,
  sparkChancePerSecond: 5,
  maxSparks: 80,
  sparkLifeSeconds: 1.1,
  mobileSporeScale: 0.4,

  // ── Nodes ────────────────────────────────────────────────────────────────
  breathSpeed: 1.7,
  breathAmount: 0.34,
} as const;

/** A branch plus the state that changes every frame. */
export type SimBranch = TreeBranch & {
  /** 0 → 1. Children activate once this crosses `MOTION.spawnThreshold`. */
  progress: number;
  rate: number;
  active: boolean;
  spawned: boolean;
  /** Recomputed every frame by `solve`. */
  worldAngle: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
};

export type Pulse = { branch: number; t: number; bright: number };
export type Spore = {
  x: number;
  y: number;
  drift: number;
  rise: number;
  radius: number;
  phase: number;
};
export type Spark = { x: number; y: number; vx: number; vy: number; life: number };

export type Simulation = {
  topology: TreeTopology;
  branches: SimBranch[];
  pulses: Pulse[];
  spores: Spore[];
  sparks: Spark[];
  elapsed: number;
  /** Signed, decaying. Zero when the air is still. */
  gustEnergy: number;
  /** Advances growth, pulses and particles by `dt` seconds. */
  step(dt: number): void;
  /** Resolves world angles and endpoints for the whole hierarchy. */
  solve(time: number, sway: boolean): void;
  /** A burst of pulses up the trunk — used on hover. */
  surge(): void;
  /** A one-off wind impulse. Sign chooses the direction. */
  gust(strength: number): void;
  /** Fast-forwards to a fully grown, quiet tree for the reduced-motion frame. */
  settle(): void;
};

/**
 * Control point of a branch's quadratic curve. Anything that has to sit on a
 * branch must derive its position from this, or it drifts off the rendered
 * path — the chord between the endpoints is not the shape being drawn.
 */
export function branchControl(branch: SimBranch, curveScale = 1): { cx: number; cy: number } {
  const dx = branch.bx - branch.ax;
  const dy = branch.by - branch.ay;
  const curve = branch.curve * curveScale;
  return {
    cx: (branch.ax + branch.bx) / 2 - dy * curve,
    cy: (branch.ay + branch.by) / 2 + dx * curve,
  };
}

/**
 * Point at `t` (0–1) along the branch's rendered curve. `curveScale` must match
 * whatever the stroke was drawn with, or anything riding the branch drifts off
 * it — which is the entire reason this shares `branchControl`.
 */
export function pointOnBranch(
  branch: SimBranch,
  t: number,
  curveScale = 1,
): { x: number; y: number } {
  const { cx, cy } = branchControl(branch, curveScale);
  const inv = 1 - t;
  const a = inv * inv;
  const b = 2 * inv * t;
  const c = t * t;
  return {
    x: a * branch.ax + b * cx + c * branch.bx,
    y: a * branch.ay + b * cy + c * branch.by,
  };
}

export type SimulationOptions = {
  /** Growth and pulse rate multiplier. Clamped to 0.25–3. */
  speed?: number;
  /** Seeds the ambient randomness. Pass the tree's seed. */
  seed: number;
};

export function createSimulation(
  topology: TreeTopology,
  { speed = 1, seed }: SimulationOptions,
): Simulation {
  const speedScale = clamp(speed, 0.25, 3);
  // Offset from the topology seed so spores do not consume the branch stream.
  const rng = createRng((seed ^ 0x9e3779b9) >>> 0);

  const perBranch =
    MOTION.growthSeconds / (1 + MOTION.spawnThreshold * Math.max(1, topology.maxDepth - 1));

  const branches: SimBranch[] = topology.branches.map((branch) => ({
    ...branch,
    progress: 0,
    rate: (1 / perBranch) * branch.rateJitter * speedScale,
    active: branch.parent === -1,
    spawned: false,
    worldAngle: 0,
    ax: 0,
    ay: 0,
    bx: 0,
    by: 0,
  }));

  const { width, height } = topology;
  const isSmall = width < MOBILE_BREAKPOINT;
  const budgetSpores = Math.max(
    0,
    Math.round(
      Math.min(
        MOTION.maxSpores,
        ((width * height) / 1_000_000) *
          MOTION.sporesPerMegapixel *
          topology.density *
          (isSmall ? MOTION.mobileSporeScale : 1),
      ),
    ),
  );

  const spores: Spore[] = Array.from({ length: budgetSpores }, () => ({
    x: rng() * width,
    y: rng() * height,
    drift: 6 + rng() * 14,
    rise: MOTION.sporeRisePixelsPerSecond * (0.5 + rng()),
    radius: 0.6 + rng() * 1.5,
    phase: rng() * Math.PI * 2,
  }));

  let sincePulse = 0;

  const step = (dt: number): void => {
    self.elapsed += dt;

    // A gust is an impulse, not a state: it decays back to still air.
    if (self.gustEnergy !== 0) {
      self.gustEnergy *= Math.exp(-dt / MOTION.gustDecaySeconds);
      if (Math.abs(self.gustEnergy) < 0.001) self.gustEnergy = 0;
    }

    for (const branch of self.branches) {
      if (!branch.active || branch.progress >= 1) continue;
      branch.progress = Math.min(1, branch.progress + dt * branch.rate);

      if (!branch.spawned && branch.progress >= MOTION.spawnThreshold) {
        branch.spawned = true;
        for (const child of branch.children) self.branches[child].active = true;
      }

      if (branch.isTip && self.sparks.length < MOTION.maxSparks) {
        if (rng() < MOTION.sparkChancePerSecond * dt) {
          self.sparks.push({
            x: branch.bx,
            y: branch.by,
            vx: (rng() - 0.5) * 22,
            vy: -12 - rng() * 26,
            life: MOTION.sparkLifeSeconds,
          });
        }
      }
    }

    sincePulse += dt;
    const interval = MOTION.pulseIntervalSeconds / speedScale;
    if (sincePulse >= interval && self.branches.length > 0) {
      sincePulse -= interval;
      if (self.pulses.length < MOTION.maxPulses && self.branches[0].progress > 0.2) {
        self.pulses.push({ branch: 0, t: 0, bright: 1 });
      }
    }

    const pulseSpeed = MOTION.pulsePixelsPerSecond * speedScale;
    self.pulses = self.pulses.filter((pulse) => {
      const branch = self.branches[pulse.branch];
      if (!branch) return false;
      pulse.t += (dt * pulseSpeed) / Math.max(1, branch.length);
      if (pulse.t < 1) return true;

      const grown = branch.children.filter((child) => self.branches[child].progress > 0.35);
      if (grown.length === 0) return false;
      pulse.branch = grown[Math.floor(rng() * grown.length)];
      pulse.t = 0;
      return true;
    });

    for (const spore of self.spores) {
      spore.y -= spore.rise * dt;
      spore.x += Math.sin(self.elapsed * 0.6 + spore.phase) * spore.drift * dt;
      if (spore.y < -8) {
        spore.y = height + 8;
        spore.x = rng() * width;
      }
    }

    self.sparks = self.sparks.filter((spark) => {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 6 * dt;
      return spark.life > 0;
    });
  };

  /**
   * Parents always precede children in the array, so a single forward loop
   * resolves the whole hierarchy — and sway accumulates naturally from trunk
   * to tip, which is what makes the wind read as one connected plant.
   */
  const solve = (time: number, sway: boolean): void => {
    for (const branch of self.branches) {
      let wobble = 0;
      if (sway) {
        wobble =
          Math.sin(time * MOTION.windSpeed + branch.swayPhase) *
          branch.swayGain *
          MOTION.windAmount;
        if (self.gustEnergy !== 0) {
          wobble +=
            Math.sin(time * MOTION.gustFrequency + branch.swayPhase * 0.35) *
            self.gustEnergy *
            branch.swayGain *
            MOTION.gustAmount;
        }
      }

      if (branch.parent === -1) {
        branch.worldAngle = branch.localAngle + wobble;
        branch.ax = topology.rootX;
        branch.ay = topology.rootY;
      } else {
        const parent = self.branches[branch.parent];
        branch.worldAngle = parent.worldAngle + branch.localAngle + wobble;
        branch.ax = parent.bx;
        branch.ay = parent.by;
      }

      const reach = branch.length * easeOut(branch.progress);
      branch.bx = branch.ax + Math.cos(branch.worldAngle) * reach;
      branch.by = branch.ay + Math.sin(branch.worldAngle) * reach;
    }
  };

  const surge = (): void => {
    for (let i = 0; i < MOTION.surgePulses; i += 1) {
      if (self.pulses.length >= MOTION.maxPulses) break;
      self.pulses.push({ branch: 0, t: (i / MOTION.surgePulses) * 0.6, bright: 1.6 });
    }
  };

  const gust = (strength: number): void => {
    self.gustEnergy = clamp(self.gustEnergy + strength, -1.5, 1.5);
  };

  const settle = (): void => {
    const dt = 1 / 60;
    const steps = Math.ceil(((MOTION.growthSeconds / speedScale) * 1.6 + 1) * 60);
    for (let i = 0; i < steps; i += 1) step(dt);
    self.pulses = [];
    self.sparks = [];
    self.gustEnergy = 0;
  };

  const self: Simulation = {
    topology,
    branches,
    pulses: [],
    spores,
    sparks: [],
    elapsed: 0,
    gustEnergy: 0,
    step,
    solve,
    surge,
    gust,
    settle,
  };

  return self;
}

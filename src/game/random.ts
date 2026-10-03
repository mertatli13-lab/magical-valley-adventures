/**
 * Small seeded random generator (mulberry32), so a run can be replayed in
 * tests. Allocates nothing after construction.
 */
export class Random {
  private state = 0;

  constructor(seed: number) {
    this.reseed(seed);
  }

  reseed(seed: number): void {
    this.state = seed >>> 0;
  }

  /** A number in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** An integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

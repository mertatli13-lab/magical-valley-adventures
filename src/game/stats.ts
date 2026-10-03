import { DEBUG } from '../config';

const SECONDS_PER_MINUTE = 60;

/**
 * Counts events in one-second buckets over a rolling window and reports a
 * per-minute rate, for the debug panel. Allocates nothing after creation.
 */
export class RateWindow {
  private readonly buckets = new Float64Array(DEBUG.RATE_WINDOW_SECONDS);
  private lastSecond = 0;

  reset(): void {
    this.buckets.fill(0);
    this.lastSecond = 0;
  }

  /** Clears buckets for seconds that have passed without events. */
  private advance(time: number): void {
    const second = Math.floor(time);
    const size = this.buckets.length;
    for (let s = this.lastSecond + 1; s <= second && s <= this.lastSecond + size; s++) this.buckets[s % size] = 0;
    if (second > this.lastSecond) this.lastSecond = second;
  }

  add(time: number, amount: number): void {
    this.advance(time);
    const index = Math.floor(time) % this.buckets.length;
    this.buckets[index] = (this.buckets[index] ?? 0) + amount;
  }

  perMinute(time: number): number {
    this.advance(time);
    const span = Math.min(time, this.buckets.length);
    if (span <= 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.buckets.length; i++) sum += this.buckets[i] ?? 0;
    return (sum / span) * SECONDS_PER_MINUTE;
  }
}

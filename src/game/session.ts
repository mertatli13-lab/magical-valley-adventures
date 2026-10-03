import { REVIVE, SPAWNER } from '../config';
import { CHARACTERS, type CharacterInfo } from './catalogue';
import { canRevive, payRunStarsFirst, reviveCost } from './economy';
import { GameMachine, type Screen } from './machine';
import { createRun, frameDt, resetRun, reviveRun, stepRun, type RunState } from './run';
import { loadSave, writeSave, type SaveData, type StorageLike } from './save';

/** What the Results screen shows for the run that just ended. */
export interface RunResult {
  starsCollected: number;
  distance: number;
  bestRun: number;
  totalStars: number;
  newBest: boolean;
}

function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

/**
 * The whole game outside rendering: the state machine (A1), the run, revives
 * and the economy (A7), and the save (A8). Plain TypeScript, so every flow can
 * be unit tested. Each method does nothing if its event is not allowed now.
 */
export class Session {
  readonly machine = new GameMachine();
  readonly run: RunState;
  save: SaveData;
  /** Stage position on the select screen. Unbounded so the stage turns the short way. */
  selection = 0;
  revivesThisRun = 0;
  /** Seconds left to accept a revive on the Out screen. */
  outTimer = 0;
  readonly result: RunResult = { starsCollected: 0, distance: 0, bestRun: 0, totalStars: 0, newBest: false };
  /** Increases whenever something the screens show changes, so the UI knows to re-render. */
  changes = 0;
  /** True from the start of a run until its stars are banked. */
  private runActive = false;

  constructor(
    private readonly storage: StorageLike | null,
    private readonly nextSeed: () => number = () => SPAWNER.DEFAULT_SEED,
  ) {
    this.save = loadSave(storage);
    this.run = createRun(nextSeed());
    this.selection = this.equippedIndex();
  }

  get screen(): Screen {
    return this.machine.screen;
  }

  private changed(): void {
    this.changes++;
  }

  private persist(): void {
    writeSave(this.storage, this.save);
  }

  private equippedIndex(): number {
    return Math.max(0, CHARACTERS.findIndex((c) => c.id === this.save.equipped.character));
  }

  get selectedCharacter(): CharacterInfo {
    return CHARACTERS[mod(this.selection, CHARACTERS.length)] ?? (CHARACTERS[0] as CharacterInfo);
  }

  /** The character the hero runs as. */
  get equippedCharacter(): CharacterInfo {
    return CHARACTERS[this.equippedIndex()] ?? (CHARACTERS[0] as CharacterInfo);
  }

  owns(character: CharacterInfo): boolean {
    return this.save.owned.characters.includes(character.id);
  }

  get reviveCost(): number {
    return reviveCost(this.revivesThisRun);
  }

  get canRevive(): boolean {
    return canRevive(this.revivesThisRun, this.save.totalStars, this.run.runStars);
  }

  // --- Landing and select ---------------------------------------------------

  play(): void {
    if (!this.machine.send('PLAY')) return;
    this.selection = this.equippedIndex();
    this.changed();
  }

  /** Turns the stage one character left (-1) or right (+1). */
  rotate(step: number): void {
    if (this.screen !== 'SELECT') return;
    this.selection += step;
    this.changed();
  }

  /** CHOOSE: equips the focused character and starts a run, if it is owned. */
  choose(): boolean {
    const character = this.selectedCharacter;
    if (this.screen !== 'SELECT' || !this.owns(character)) return false;
    this.save.equipped.character = character.id;
    this.persist();
    this.startRun();
    this.machine.send('CHOOSE');
    this.changed();
    return true;
  }

  /** Tapping a locked character opens the shop for it. */
  tapLocked(): boolean {
    if (this.screen !== 'SELECT' || this.owns(this.selectedCharacter)) return false;
    this.machine.send('TAP_LOCKED');
    this.changed();
    return true;
  }

  // --- Run, pause, out -------------------------------------------------------

  private startRun(): void {
    resetRun(this.run, this.nextSeed());
    this.revivesThisRun = 0;
    this.outTimer = 0;
    this.runActive = true;
  }

  /** Banks the run's stars and updates the best run (A7). Runs once per run. */
  private endRun(): void {
    if (!this.runActive) return;
    this.runActive = false;
    const collected = this.run.runStarsCollected;
    const previousBest = this.save.bestRun;
    this.save.totalStars += this.run.runStars;
    this.save.bestRun = Math.max(previousBest, collected);
    this.persist();
    this.result.starsCollected = collected;
    this.result.distance = this.run.distance;
    this.result.bestRun = this.save.bestRun;
    this.result.totalStars = this.save.totalStars;
    this.result.newBest = collected > previousBest;
  }

  pause(): void {
    if (this.machine.send('PAUSE')) this.changed();
  }

  resume(): void {
    if (this.machine.send('RESUME')) this.changed();
  }

  /** Restart from the Pause screen: the current run's stars are banked first. */
  restart(): void {
    if (!this.machine.canSend('RESTART')) return;
    this.endRun();
    this.startRun();
    this.machine.send('RESTART');
    this.changed();
  }

  /** Home from Pause (banks the run) or from Results. */
  home(): void {
    if (!this.machine.canSend('HOME')) return;
    this.endRun();
    this.machine.send('HOME');
    this.changed();
  }

  /** Pays for a revive and continues the run (A7). */
  revive(): boolean {
    if (this.screen !== 'OUT' || !this.canRevive) return false;
    const paid = payRunStarsFirst(this.reviveCost, this.run.runStars, this.save.totalStars);
    this.run.runStars = paid.runStars;
    this.save.totalStars = paid.totalStars;
    this.persist();
    this.revivesThisRun++;
    reviveRun(this.run);
    this.machine.send('REVIVE');
    this.changed();
    return true;
  }

  /** No thanks, or the countdown ran out: bank the stars and show the results. */
  decline(): void {
    if (!this.machine.canSend('DECLINE')) return;
    this.endRun();
    this.machine.send('DECLINE');
    this.changed();
  }

  // --- Results and shop ------------------------------------------------------

  playAgain(): void {
    if (!this.machine.canSend('PLAY_AGAIN')) return;
    this.startRun();
    this.machine.send('PLAY_AGAIN');
    this.changed();
  }

  openShop(): void {
    if (this.machine.send('SHOP')) this.changed();
  }

  back(): void {
    if (this.machine.send('BACK')) this.changed();
  }

  // --- Frame -------------------------------------------------------------------

  /** One frame. Only RUN advances the simulation; OUT runs the revive countdown. */
  update(realDt: number, now: number): void {
    if (this.screen === 'RUN') {
      stepRun(this.run, realDt, now);
      if (this.run.status === 'OUT') {
        this.machine.send('HEARTS_ZERO');
        this.outTimer = REVIVE.OFFER_TIME;
        this.changed();
      }
    } else if (this.screen === 'OUT') {
      const shownBefore = Math.ceil(this.outTimer);
      this.outTimer = Math.max(0, this.outTimer - frameDt(realDt));
      if (Math.ceil(this.outTimer) !== shownBefore) this.changed();
      if (this.outTimer === 0) this.decline();
    }
  }
}

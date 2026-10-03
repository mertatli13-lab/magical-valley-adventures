import { CHARACTERS } from '../game/catalogue';

/**
 * Screen positions (CSS pixels) of the price tags above the characters on the
 * select stage. The scene writes them every frame; the Select screen reads
 * them to place its tags. Fixed-size buffers, no allocation per frame.
 */
export const stageTags = {
  x: new Float32Array(CHARACTERS.length),
  y: new Float32Array(CHARACTERS.length),
  visible: new Uint8Array(CHARACTERS.length),
};

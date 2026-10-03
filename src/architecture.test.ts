import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FORBIDDEN = /from\s+['"](react|react-dom|three|@react-three\/[^'"]+)(\/[^'"]*)?['"]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('architecture', () => {
  it('keeps src/game and src/config.ts free of React and three.js', () => {
    const root = join(import.meta.dirname, '..', 'src');
    const files = [...sourceFiles(join(root, 'game')), join(root, 'config.ts')];
    const offenders = files.filter((file) => FORBIDDEN.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { RANK02_CATALOG } from '../../src/content/rank02Catalog';
import source from '../../src/engine-check.ts?raw';

// O engine-check.html vai para o dist/: os programas dele não podem resolver nenhum exercício.
describe('engine-check', () => {
  it.each(RANK02_CATALOG.map((e) => e.id))('não menciona o exercício %s', (id) => {
    expect(new RegExp(`\\b${id}\\b`).test(source), `src/engine-check.ts menciona ${id}`).toBe(false);
  });
});

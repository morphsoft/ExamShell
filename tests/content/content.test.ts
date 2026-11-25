import { beforeAll, describe, expect, it } from 'vitest';
import { byLevel, getExercise, loadExercises } from '../../src/content/loadExercises';
import { LEVEL_INFO } from '../../src/content/levels';
import { RANK02_CATALOG } from '../../src/content/rank02Catalog';
import { exerciseContentSchema } from '../../src/content/schema';
import { grade } from '../../src/engine/grade';
import type { Engine, LoadedExercise, SourceFiles } from '../../src/engine/types';
import { looksLikeCode } from '../../src/hints/looksLikeCode';
import { createNodeEngine } from '../support/nodeEngine';

const SENTINEL = '/* EXAMSHELL-REFERENCE: nunca publicar */';
const PILOTS = ['first_word', 'ft_strlen', 'inter', 'ft_list_size', 'ft_itoa'];

// Lidos pelo Vite (como o site faz), sem APIs do Node. reference/ só entra aqui, nunca no site.
const contentFiles = import.meta.glob('/content/rank02/*/*');
const rawExerciseJson = import.meta.glob<string>('/content/rank02/*/exercise.json', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const prototypeHtml = import.meta.glob<string>('/docs/superpowers/specs/prototypes/inicio-preparacao.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const referenceFiles = import.meta.glob<string>('/reference/rank02/*/*', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** Agrupa caminhos `/<raiz>/rank02/<id>/<arquivo>` por id. */
function byFolder(paths: string[]): Map<string, string[]> {
  const folders = new Map<string, string[]>();
  for (const path of paths) {
    const [id, name] = path.split('/').slice(-2);
    folders.set(id, [...(folders.get(id) ?? []), name]);
  }
  return folders;
}
const contentFolders = () => [...byFolder(Object.keys(contentFiles)).keys()];

describe('catálogo do Rank 02', () => {
  it('tem 57 entradas, com 12/20/15/10 por nível', () => {
    expect(RANK02_CATALOG).toHaveLength(57);
    const perLevel = [1, 2, 3, 4].map((level) => RANK02_CATALOG.filter((e) => e.level === level).length);
    expect(perLevel).toEqual([12, 20, 15, 10]);
  });

  it('os ids são únicos', () => {
    const ids = RANK02_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada entrada é coerente: o 1º arquivo é <id>.c e só função tem protótipo', () => {
    for (const e of RANK02_CATALOG) {
      expect(e.expectedFiles[0], e.id).toBe(`${e.id}.c`);
      expect(e.prototype !== undefined, e.id).toBe(e.kind === 'function');
    }
  });
});

describe('loadExercises', () => {
  it('carrega exatamente as pastas de content/rank02, na ordem do catálogo', () => {
    const catalogIds = RANK02_CATALOG.map((e) => e.id);
    const folders = contentFolders();
    for (const f of folders) expect(catalogIds, `pasta ${f} fora do catálogo`).toContain(f);
    const expectedOrder = catalogIds.filter((id) => folders.includes(id));
    expect(loadExercises().map((e) => e.id)).toEqual(expectedOrder);
  });

  it('todos os 57 exercícios têm conteúdo', () => expect(loadExercises()).toHaveLength(57));

  it('inclui os 5 pilotos', () => {
    const ids = loadExercises().map((e) => e.id);
    for (const id of PILOTS) expect(ids).toContain(id);
  });

  it('getExercise acha pelo id e devolve undefined para id desconhecido', () => {
    expect(getExercise('ft_strlen')?.prototype).toBe('int ft_strlen(char *str);');
    expect(getExercise('nao_existe')).toBeUndefined();
  });

  it('byLevel agrupa nos 4 níveis, mantendo a ordem', () => {
    const list = loadExercises();
    const groups = byLevel(list);
    expect(Object.keys(groups).sort()).toEqual(['1', '2', '3', '4']);
    for (const level of [1, 2, 3, 4] as const) {
      expect(groups[level].map((e) => e.id)).toEqual(list.filter((e) => e.level === level).map((e) => e.id));
    }
  });
});

let engine: Engine;
beforeAll(async () => {
  engine = await createNodeEngine();
});

const exercises = loadExercises();

describe.each(exercises.map((ex) => [ex.id, ex] as [string, LoadedExercise]))('%s', (id, ex) => {
  it('1. exercise.json passa no schema, e o id é o nome da pasta', () => {
    const raw: unknown = JSON.parse(rawExerciseJson[`/content/rank02/${id}/exercise.json`]);
    const parsed = exerciseContentSchema.safeParse(raw);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(RANK02_CATALOG.find((e) => e.id === id)).toMatchObject({
      level: ex.level,
      kind: ex.kind,
      expectedFiles: ex.expectedFiles,
      allowedFunctions: ex.allowedFunctions,
    });
    for (const name of Object.keys(ex.starter ?? {})) expect(ex.expectedFiles).toContain(name);
    for (const name of Object.keys(ex.provided ?? {})) {
      expect(name, 'provided só tem headers').toMatch(/\.h$/);
      expect(ex.expectedFiles, `${name} é fornecido, não entregue`).not.toContain(name);
      expect(ex.starter ?? {}, `${name} não pode ser starter`).not.toHaveProperty(name);
    }
  });

  it('1b. headers fornecidos: só sort_list e ft_list_remove_if, e o subject os cita', () => {
    const withProvided = ['sort_list', 'ft_list_remove_if'];
    expect(ex.provided !== undefined).toBe(withProvided.includes(id));
    for (const name of Object.keys(ex.provided ?? {})) {
      expect(ex.subject.en).toContain(name);
      expect(ex.subject.en.split('\n')[1]).not.toContain(name);
    }
  });

  it('2. subject.en no formato da prova e subject.pt traduzido', () => {
    const en = ex.subject.en;
    expect(en.startsWith(`Assignment name  : ${id}\n`)).toBe(true);
    const lines = en.split('\n');
    expect(lines[1]).toBe(`Expected files   : ${ex.expectedFiles.join(', ')}`);
    expect(lines[2]).toBe(`Allowed functions: ${ex.allowedFunctions.join(', ')}`.trimEnd());
    expect(lines[3]).toBe('-'.repeat(80));
    expect(en).toContain('Examples:');
    if (ex.prototype !== undefined) expect(en.replace(/\s+/g, ' ')).toContain(ex.prototype);

    expect(ex.subject.pt.trim()).not.toBe('');
    for (const label of ['Nome do exercício', 'Arquivos esperados', 'Funções permitidas']) {
      expect(ex.subject.pt).toContain(label);
    }
  });

  it('3. de 6 a 15 testes, com ids únicos t\\d\\d', () => {
    expect(ex.tests.length).toBeGreaterThanOrEqual(6);
    expect(ex.tests.length).toBeLessThanOrEqual(15);
    const ids = ex.tests.map((t) => t.id);
    for (const testId of ids) expect(testId).toMatch(/^t\d\d$/);
    expect(new Set(ids).size).toBe(ids.length);
    if (ex.kind === 'function') {
      ex.tests.forEach((t, i) => {
        expect(t.display?.trim(), t.id).toBeTruthy();
        expect(t.args, t.id).toEqual([String(i)]);
      });
      expect(ex.harness, 'harness.c').toBeDefined();
      expect(ex.harness).toContain('switch (atoi(argv[1]))');
      ex.tests.forEach((_, i) => expect(ex.harness).toMatch(new RegExp(`\\bcase ${i}:`)));
    } else {
      expect(ex.tests.some((t) => t.args.length === 0)).toBe(true);
      expect(ex.harness).toBeUndefined();
    }
  });

  it('4. toda category tem uma escada de 3 dicas, sem código', () => {
    const used = new Set(ex.tests.map((t) => t.category));
    for (const category of used) {
      const ladder = ex.hints[category];
      expect(ladder, `dicas de "${category}"`).toBeDefined();
      expect(ladder).toHaveLength(3);
      for (const hint of ladder) {
        expect(hint.trim(), category).not.toBe('');
        expect(looksLikeCode(hint), `dica com cara de código: ${hint}`).toBe(false);
      }
    }
    expect(Object.keys(ex.hints).filter((c) => !used.has(c)), 'escadas sem teste').toEqual([]);
  });

  it('5. expected tem uma entrada para cada teste', () => {
    expect(Object.keys(ex.expected).sort()).toEqual(ex.tests.map((t) => t.id).sort());
    for (const t of ex.tests) expect(typeof ex.expected[t.id]?.stdout, t.id).toBe('string');
  });

  it('6. a referência tem a sentinela e passa em todos os testes no Clang do site', async () => {
    const dir = `/reference/rank02/${id}/`;
    const names = byFolder(Object.keys(referenceFiles)).get(id) ?? [];
    expect(names.length, `${dir} existe`).toBeGreaterThan(0);
    expect([...names].sort()).toEqual([...ex.expectedFiles].sort());
    const files: SourceFiles = {};
    for (const name of names) {
      files[name] = referenceFiles[dir + name];
      expect(files[name].split('\n')[0], name).toBe(SENTINEL);
    }
    const result = await grade(ex, files, engine);
    expect(result.failure).toBeNull();
    expect(result.passed).toBe(ex.tests.length);
  });
});

describe('descrição curta', () => {
  it('todo exercício tem summary de 1 a 80 caracteres, sem código e sem repetir', () => {
    const all = loadExercises();
    for (const ex of all) {
      expect(ex.summary.length, ex.id).toBeGreaterThan(0);
      expect(ex.summary.length, ex.id).toBeLessThanOrEqual(80);
      expect(looksLikeCode(ex.summary), ex.id).toBe(false);
    }
    expect(new Set(all.map((e) => e.summary)).size).toBe(57);
  });

  it('bate com o array EX do protótipo: mesmos ids, níveis e textos', () => {
    const html = Object.values(prototypeHtml)[0] ?? '';
    const block = html.slice(html.indexOf('var EX = ['), html.indexOf('].map(function (r)'));
    const tuples = [...block.matchAll(/\["([^"]+)",(\d),"[PF]",("(?:[^"\\]|\\.)*"),/g)].map((m) => ({
      id: m[1],
      level: Number(m[2]),
      summary: JSON.parse(m[3]) as string,
    }));
    expect(tuples).toHaveLength(57);
    expect(tuples.map(({ id, level }) => ({ id, level }))).toEqual(
      RANK02_CATALOG.map(({ id, level }) => ({ id, level })),
    );
    for (const t of tuples) expect(getExercise(t.id)?.summary, t.id).toBe(t.summary);
  });
});

it('LEVEL_INFO tem os 4 títulos do spec', () => {
  expect(LEVEL_INFO).toEqual({
    1: { title: 'Primeiros passos', subtitle: 'strings, write e laços' },
    2: { title: 'Strings e bits', subtitle: 'funções da libc, bits e malloc' },
    3: { title: 'Números e listas', subtitle: 'matemática, bases e listas encadeadas' },
    4: { title: 'Algoritmos', subtitle: 'split, ordenação e flood fill' },
  });
});

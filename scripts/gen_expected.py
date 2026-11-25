#!/usr/bin/env python3
"""Gera content/rank02/<id>/expected.json a partir das soluções de referência.

Uso: python3 scripts/gen_expected.py [--check] [ids...]

Roda no Linux (WSL ou CI), só com a biblioteca padrão e o gcc. Para cada exercício:
  1. compila reference/rank02/<id>/*.c (mais content/rank02/<id>/harness.c, se existir);
  2. roda cada teste do exercise.json com os mesmos argv/stdin que o site usa;
  3. grava a saída padrão, byte a byte, como string latin-1.

Com --check, não grava nada e sai com código 1 se algum expected.json mudaria.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content' / 'rank02'
REFERENCE = ROOT / 'reference' / 'rank02'
# -std=gnu17: o mesmo padrão do Clang do site (o gcc 15 usaria gnu23 por padrão).
CFLAGS = ['-std=gnu17', '-Wall', '-Wextra', '-Werror']
TIMEOUT_S = 5


class GenError(Exception):
    pass


def available_ids():
    return sorted(p.name for p in CONTENT.iterdir() if (p / 'exercise.json').is_file())


def build(ex_id, tmp):
    ref = REFERENCE / ex_id
    sources = sorted(ref.glob('*.c'))
    if not sources:
        raise GenError(f'{ex_id}: nenhum .c em {ref}')
    harness = CONTENT / ex_id / 'harness.c'
    if harness.is_file():
        sources.append(harness)
    binary = Path(tmp) / ex_id
    cmd = ['gcc', *CFLAGS, '-I', str(ref), '-o', str(binary), *map(str, sources)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise GenError(f'{ex_id}: o gcc falhou\n{" ".join(cmd)}\n{r.stderr}')


def run_tests(ex_id, tmp, tests):
    expected = {}
    for t in tests:
        args = t['args']
        if any('\0' in a for a in args):
            raise GenError(f'{ex_id} {t["id"]}: argumento com byte nulo')
        stdin = t.get('stdin', '').encode('latin-1')  # o site manda stdin byte a byte (latin-1)
        try:
            # argv[0] = ./<id>, como no site
            r = subprocess.run(['./' + ex_id, *args], cwd=tmp, input=stdin, capture_output=True, timeout=TIMEOUT_S)
        except subprocess.TimeoutExpired:
            raise GenError(f'{ex_id} {t["id"]}: tempo esgotado ({TIMEOUT_S} s) com args {args!r}')
        if r.returncode < 0:
            raise GenError(f'{ex_id} {t["id"]}: a referência morreu com o sinal {-r.returncode} com args {args!r}')
        expected[t['id']] = {'stdout': r.stdout.decode('latin-1')}
    return expected


def generate(ex_id):
    exercise = json.loads((CONTENT / ex_id / 'exercise.json').read_text(encoding='utf-8'))
    with tempfile.TemporaryDirectory(prefix=f'examshell-{ex_id}-') as tmp:
        build(ex_id, tmp)
        expected = run_tests(ex_id, tmp, exercise['tests'])
    return json.dumps(expected, sort_keys=True, indent=2, ensure_ascii=True) + '\n'


def main(argv):
    parser = argparse.ArgumentParser(description='Gera os expected.json do Rank 02 a partir de reference/.')
    parser.add_argument('--check', action='store_true', help='não grava; sai com 1 se algum arquivo mudaria')
    parser.add_argument('ids', nargs='*', help='exercícios (padrão: todos com exercise.json)')
    opts = parser.parse_args(argv)

    known = available_ids()
    unknown = [i for i in opts.ids if i not in known]
    if unknown:
        print(f'erro: sem content/rank02/<id>/exercise.json para: {", ".join(unknown)}', file=sys.stderr)
        return 2
    ids = opts.ids or known

    stale = []
    try:
        for ex_id in ids:
            text = generate(ex_id)
            path = CONTENT / ex_id / 'expected.json'
            current = path.read_text(encoding='utf-8') if path.is_file() else None
            if text == current:
                print(f'ok        {ex_id}')
            elif opts.check:
                stale.append(ex_id)
                print(f'MUDARIA   {ex_id}')
            else:
                path.write_text(text, encoding='utf-8', newline='\n')
                print(f'gravado   {ex_id}')
    except GenError as e:
        print(f'erro: {e}', file=sys.stderr)
        return 1

    if stale:
        print(f'\n{len(stale)} expected.json desatualizado(s). Rode: npm run gen:expected', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

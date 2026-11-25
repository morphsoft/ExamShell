import { onlyNewlineDiff } from '../engine/compare';
import type { Failure, HintLadder, LoadedExercise } from '../engine/types';
import { GENERIC_HINTS } from './genericHints';

export function hintsFor(failure: Failure, ex: LoadedExercise): HintLadder {
  switch (failure.kind) {
    case 'compile':
      return GENERIC_HINTS.compile;
    case 'forbidden':
      return GENERIC_HINTS.forbidden;
    case 'link':
      if (failure.reason === 'duplicate-main') return GENERIC_HINTS['duplicate-main'];
      if (failure.reason === 'missing-symbol') return GENERIC_HINTS['missing-symbol'];
      return GENERIC_HINTS.compile;
    case 'crash':
      return GENERIC_HINTS.crash;
    case 'timeout':
      return GENERIC_HINTS.timeout;
    case 'wrong-output':
      if (onlyNewlineDiff(failure.expected, failure.actual)) return GENERIC_HINTS.newline;
      return ex.hints[failure.test.category] ?? GENERIC_HINTS['wrong-output'];
  }
}

import { z } from 'zod';
import type { ExerciseContent } from '../engine/types';

/** kebab-case: minúsculas, dígitos e hífens simples (ex.: "espacos-no-inicio"). */
const kebab = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use kebab-case');
const hint = z.string().min(1);

const testCaseSchema = z
  .object({
    id: z.string().regex(/^t\d\d$/, 'use t01..t15'),
    args: z.array(z.string()),
    stdin: z.string().optional(),
    category: kebab,
    display: z.string().min(1).optional(),
  })
  .strict();

/** Formato de `content/rank02/<id>/exercise.json`. */
export const exerciseContentSchema = z
  .object({
    tests: z.array(testCaseSchema).min(1),
    hints: z.record(kebab, z.tuple([hint, hint, hint])),
    starter: z.record(z.string(), z.string()).optional(),
  })
  .strict();

// Quebra o `tsc` se o schema e o tipo ExerciseContent se afastarem.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const schemaMatchesType: Same<z.infer<typeof exerciseContentSchema>, ExerciseContent> = true;
void schemaMatchesType;

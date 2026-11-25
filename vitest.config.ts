import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'engine',
          include: ['tests/engine/**/*.test.{ts,tsx}'],
          testTimeout: 120000,
        },
      },
      {
        test: {
          name: 'content',
          include: ['tests/content/**/*.test.{ts,tsx}'],
          testTimeout: 600000,
        },
      },
    ],
  },
});

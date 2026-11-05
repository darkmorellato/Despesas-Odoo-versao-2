import { defineConfig } from 'vitest/config'

/**
 * Testes das regras do Firestore (precisam do emulador + Java).
 * Rode com `npm run test:rules` — o script sobe o emulador e executa este config.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/rules/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})

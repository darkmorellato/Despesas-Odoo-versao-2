import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Testes das regras do Firestore (precisam do emulador + Java).
 * Rode com `npm run test:rules` — o script sobe o emulador e executa este config.
 */
export default defineConfig({
  // Os testes de integração importam código do app (alias '@')
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    include: ['src/__tests__/rules/**/*.test.ts'],
    // Os arquivos compartilham o mesmo emulador/projeto (um deles limpa o
    // Firestore a cada teste): rodar em sequência evita interferência entre eles.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})

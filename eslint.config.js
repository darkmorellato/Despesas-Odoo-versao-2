import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Configuração ESLint (flat config) do projeto Despesas Miplace.
 *
 * Estratégia: base recomendada do JS + typescript-eslint (não-strict),
 * com apenas UMA regra em erro (rules-of-hooks) — o restante fica em
 * warn/off para não bloquear o fluxo de desenvolvimento atual.
 *
 * Obs.: os pacotes eslint/@eslint/js/typescript-eslint/eslint-plugin-react-hooks
 * devem ser instalados com `npm install` antes de rodar `npm run lint`.
 */
export default tseslint.config(
  // Fora do escopo do lint
  { ignores: ['dist/**', 'node_modules/**', 'scripts/**', 'backups/**', 'coverage/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Regra crítica: hooks nunca podem ser chamados condicionalmente
      'react-hooks/rules-of-hooks': 'error',

      // Todo o restante em warn/off
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-empty': 'warn',
      'no-console': 'off',
      'no-constant-condition': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
    },
  },

  {
    // Testes podem usar any/explicit assertions livremente
    files: ['src/**/*.test.{ts,tsx}', 'src/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);

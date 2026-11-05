import { STORE_CONFIGS, STORE_GROUP_CONFIGS, STORE_DISPLAY_ORDER } from '@/config/stores';

// Cores derivadas de src/config/stores.ts (fonte única). "Amparo" é um apelido
// antigo mantido para compatibilidade com dados já gravados.
const STORE_BADGE_CLASSES: Record<string, string> = {
  ...Object.fromEntries(STORE_CONFIGS.map(s => [s.name, s.badgeClass])),
  ...Object.fromEntries(STORE_GROUP_CONFIGS.map(g => [g.name, g.badgeClass])),
  "Amparo": "bg-purple-50/50 text-purple-600 border-purple-200 shadow-sm",
};
const STORE_BAR_GRADIENTS: Record<string, string> = {
  ...Object.fromEntries(STORE_CONFIGS.map(s => [s.name, s.barGradient])),
  "Amparo": "from-pink-500 to-pink-300",
};

/**
 * Obtém classes Tailwind CSS para cores específicas de cada loja (estilo badge)
 * 
 * Retorna classes para background, texto e borda baseadas no nome da loja.
 * 
 * @param storeName - Nome da loja
 * @returns String com classes Tailwind para estilização
 * 
 * @example
 * ```tsx
 * const colorClass = getStoreColorClass('Premium');
 * // Retorna: 'bg-fuchsia-50/50 text-fuchsia-600 border-fuchsia-200 shadow-sm'
 * 
 * <span className={getStoreColorClass(store)}>{store}</span>
 * ```
 */
export const getStoreColorClass = (storeName: string): string => {
  return STORE_BADGE_CLASSES[storeName] || "bg-gray-50 text-gray-600 border-gray-200";
};

/**
 * Obtém classes de gradiente para barras de gráfico por loja
 * 
 * Usado nos gráficos do dashboard analítico.
 * 
 * @param storeName - Nome da loja
 * @returns String com classes de gradiente Tailwind
 * 
 * @example
 * ```tsx
 * <div className={`bg-gradient-to-r ${getStoreBarColor(store)}`} />
 * ```
 */
export const getStoreBarColor = (storeName: string): string => {
  return STORE_BAR_GRADIENTS[storeName] || "from-slate-400 to-slate-200";
};

/**
 * Obtém ordem de exibição para loja (usado em ordenação)
 * 
 * Define a ordem padrão de exibição das lojas em listas e rankings.
 * 
 * @param storeName - Nome da loja
 * @returns Número de ordem (menor = aparece primeiro)
 * 
 * @example
 * ```ts
 * const sorted = stores.sort((a, b) => getStoreOrder(a) - getStoreOrder(b));
 * ```
 */
export const getStoreOrder = (storeName: string): number => {
  return STORE_DISPLAY_ORDER[storeName] || 99;
};

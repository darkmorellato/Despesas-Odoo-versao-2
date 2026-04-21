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
  const map: Record<string, string> = {
    "Dom Pedro II": "bg-blue-50/50 text-blue-600 border-blue-200 shadow-sm",
    "Realme": "bg-yellow-50/50 text-yellow-600 border-yellow-200 shadow-sm",
    "Xv de Novembro": "bg-slate-50/50 text-slate-600 border-slate-200 shadow-sm",
    "Premium": "bg-fuchsia-50/50 text-fuchsia-600 border-fuchsia-200 shadow-sm",
    "Amparo": "bg-purple-50/50 text-purple-600 border-purple-200 shadow-sm",
    "Kassouf": "bg-orange-50/50 text-orange-600 border-orange-200 shadow-sm",
    "Piracicaba (DP - Realme - XV)": "bg-red-50/50 text-red-600 border-red-200 shadow-sm",
    "Amparo (Premium - Kassouf)": "bg-pink-50/50 text-pink-600 border-pink-200 shadow-sm",
    "Todas": "bg-emerald-50/50 text-emerald-600 border-emerald-200 shadow-sm"
  };
  return map[storeName] || "bg-gray-50 text-gray-600 border-gray-200";
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
  const map: Record<string, string> = {
    "Dom Pedro II": "from-blue-500 to-blue-300",
    "Realme": "from-yellow-400 to-yellow-200",
    "Xv de Novembro": "from-slate-900 to-slate-600",
    "Premium": "from-purple-500 to-purple-300",
    "Kassouf": "from-orange-500 to-orange-300",
    "Amparo": "from-pink-500 to-pink-300"
  };
  return map[storeName] || "from-slate-400 to-slate-200";
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
  const order: Record<string, number> = {
    "Dom Pedro II": 1,
    "Realme": 2,
    "Kassouf": 3,
    "Premium": 4,
    "Xv de Novembro": 5,
  };
  return order[storeName] || 99;
};

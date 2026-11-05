/**
 * FONTE ÚNICA da configuração de lojas e grupos de rateio.
 *
 * Para adicionar/remover uma loja ou mudar a composição de um grupo (ex.: o
 * "Todas"), altere SOMENTE este arquivo. Tudo o mais (lista do formulário,
 * cores, ordem, imagens, rateio, dicas) é derivado daqui.
 */

export interface StoreConfig {
  /** Nome gravado nas despesas (não mude sem migrar os dados!) */
  name: string;
  /** Posição nas listas, relatórios e PDFs */
  order: number;
  image: string;
  /** Classes Tailwind do selo (badge) da loja */
  badgeClass: string;
  /** Gradiente Tailwind das barras de gráfico */
  barGradient: string;
}

export interface StoreGroupConfig {
  /** Nome do grupo, gravado no formulário (nunca nas despesas: elas são divididas por loja) */
  name: string;
  /** Lojas entre as quais o valor é dividido (em partes iguais) */
  members: readonly string[];
  badgeClass: string;
  /** Texto de ajuda exibido no formulário ao escolher o grupo */
  hint: string;
  /** Cor do texto da dica */
  hintClass: string;
}

export const STORE_CONFIGS = [
  { name: 'Dom Pedro II',   order: 1, image: './images/dompedro.png', badgeClass: 'bg-blue-50/50 text-blue-600 border-blue-200 shadow-sm',          barGradient: 'from-blue-500 to-blue-300' },
  { name: 'Realme',         order: 2, image: './images/realme.png',   badgeClass: 'bg-yellow-50/50 text-yellow-600 border-yellow-200 shadow-sm',    barGradient: 'from-yellow-400 to-yellow-200' },
  { name: 'Kassouf',        order: 3, image: './images/kassouf.png',  badgeClass: 'bg-orange-50/50 text-orange-600 border-orange-200 shadow-sm',    barGradient: 'from-orange-500 to-orange-300' },
  { name: 'Premium',        order: 4, image: './images/premium.png',  badgeClass: 'bg-fuchsia-50/50 text-fuchsia-600 border-fuchsia-200 shadow-sm', barGradient: 'from-purple-500 to-purple-300' },
  { name: 'Xv de Novembro', order: 5, image: './images/xv.png',       badgeClass: 'bg-slate-50/50 text-slate-600 border-slate-200 shadow-sm',       barGradient: 'from-slate-900 to-slate-600' },
] as const satisfies readonly StoreConfig[];

/**
 * Grupos de rateio. A ORDEM importa: ao reconhecer um lançamento antigo, o
 * primeiro grupo cujas lojas estiverem todas presentes vence (do maior para o menor).
 */
export const STORE_GROUP_CONFIGS = [
  {
    name: 'Todas',
    // A Kassouf NÃO participa do rateio geral — só do grupo Amparo ou avulsa.
    members: ['Dom Pedro II', 'Realme', 'Xv de Novembro', 'Premium'],
    badgeClass: 'bg-emerald-50/50 text-emerald-600 border-emerald-200 shadow-sm',
    hint: '* Divide por 4 empresas (Dom Pedro II, Realme, XV, Premium)',
    hintClass: 'text-emerald-600',
  },
  {
    name: 'Piracicaba (DP - Realme - XV)',
    members: ['Dom Pedro II', 'Realme', 'Xv de Novembro'],
    badgeClass: 'bg-red-50/50 text-red-600 border-red-200 shadow-sm',
    hint: '* Divide por 3 lojas (Dom Pedro II, Realme, XV)',
    hintClass: 'text-amber-600',
  },
  {
    name: 'Amparo (Premium - Kassouf)',
    members: ['Premium', 'Kassouf'],
    badgeClass: 'bg-pink-50/50 text-pink-600 border-pink-200 shadow-sm',
    hint: '* Divide por 2 lojas (Premium, Kassouf)',
    hintClass: 'text-purple-600',
  },
] as const satisfies readonly StoreGroupConfig[];

/**
 * Composição ANTIGA de "Todas" (5 lojas, com a Kassouf). Existe apenas para
 * reconhecer lançamentos históricos já gravados nesse formato — nunca para
 * novos rateios.
 */
export const LEGACY_TODAS_MEMBERS: readonly string[] = [
  'Dom Pedro II', 'Realme', 'Xv de Novembro', 'Premium', 'Kassouf',
];

// ----------------------------------------------------------------------------
// Tipos e derivados
// ----------------------------------------------------------------------------

export type IndividualStoreName = (typeof STORE_CONFIGS)[number]['name'];
export type StoreGroupName = (typeof STORE_GROUP_CONFIGS)[number]['name'];
export type StoreName = IndividualStoreName | StoreGroupName;

/** Lojas individuais, na ordem de exibição */
export const INDIVIDUAL_STORES: readonly IndividualStoreName[] =
  [...STORE_CONFIGS].sort((a, b) => a.order - b.order).map(s => s.name);

/** Opções do seletor de loja: lojas individuais (ordem de cadastro) + grupos */
export const STORES_LIST: StoreName[] = [
  ...STORE_CONFIGS.map(s => s.name),
  ...STORE_GROUP_CONFIGS.map(g => g.name),
];

/** Grupo → lojas que recebem o rateio */
export const GROUP_STORES_MAP: Record<string, StoreName[]> = Object.fromEntries(
  STORE_GROUP_CONFIGS.map(g => [g.name, [...g.members] as StoreName[]])
);

export const STORE_DISPLAY_ORDER: Record<string, number> = Object.fromEntries(
  STORE_CONFIGS.map(s => [s.name, s.order])
);

export const DEFAULT_STORE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='1.5'%3E%3Cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/svg%3E";

export const STORE_IMAGES: Record<string, string> = {
  ...Object.fromEntries(STORE_CONFIGS.map(s => [s.name, s.image])),
  default: DEFAULT_STORE_IMAGE,
};

export const isStoreGroupName = (name: string): name is StoreGroupName =>
  STORE_GROUP_CONFIGS.some(g => g.name === name);

/** Dica do formulário para um grupo (ou undefined para loja individual) */
export const getGroupHint = (name: string): { text: string; className: string } | undefined => {
  const g = STORE_GROUP_CONFIGS.find(x => x.name === name);
  return g ? { text: g.hint, className: g.hintClass } : undefined;
};

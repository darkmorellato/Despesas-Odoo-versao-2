import type { StoreName, CategoryName, FixedNotification } from '@/shared/types';

export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "#Banana@10";

export const CATEGORIES_LIST = [
  "Despesa Fixa",
  "Despesa",
  "Salário",
  "Vale Alimentação",
  "Vale Transporte",
  "Vale (Adiantamento)",
  "Despesa Jack",
  "Impostos",
  "Requisição"
].sort() as CategoryName[];

export const STORES_LIST: StoreName[] = [
  "Dom Pedro II",
  "Realme",
  "Xv de Novembro",
  "Premium",
  "Kassouf",
  "Piracicaba (DP - Realme - XV)",
  "Amparo (Premium - Kassouf)",
  "Todas"
];

export const STORE_DISPLAY_ORDER: Record<string, number> = {
  "Dom Pedro II": 1,
  "Realme": 2,
  "Kassouf": 3,
  "Premium": 4,
  "Xv de Novembro": 5,
};

export const STORE_IMAGES: Record<string, string> = {
  "Dom Pedro II": "/images/dompedro.png",
  "Realme": "/images/realme.png",
  "Xv de Novembro": "/images/xv.png",
  "Premium": "/images/premium.png",
  "Kassouf": "/images/kassouf.png",
  "default": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='1.5'%3E%3Cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/svg%3E"
};

export const FIXED_NOTIFICATIONS_DEFAULT: FixedNotification[] = [
  { id: 'default_1', day: 5, description: "Aluguel Loja Premium" },
  { id: 'default_2', day: 5, description: "Contabilidade Colorado" },
  { id: 'default_3', day: 5, description: "Escola Wendell" },
  { id: 'default_4', day: 5, description: "Faculdade Filipe" },
  { id: 'default_5', day: 5, description: "Internet Loja Dom Pedro" },
  { id: 'default_6', day: 5, description: "Pagamento de Salários" },
  { id: 'default_7', day: 5, description: "Semae Loja Dom Pedro" },
  { id: 'default_8', day: 5, description: "Semae Loja Xv (Nova)" },
  { id: 'default_9', day: 10, description: "Aluguel Loja Kassouf" },
  { id: 'default_10', day: 10, description: "Aluguel Loja Realme" },
  { id: 'default_11', day: 10, description: "Comgás - Débito aut." },
  { id: 'default_12', day: 10, description: "Condominio Loja Kassouf" },
  { id: 'default_13', day: 10, description: "Condominio Miori" },
  { id: 'default_14', day: 10, description: "Energia Loja Dom Pedro" },
  { id: 'default_15', day: 10, description: "Energia Loja Kassouf" },
  { id: 'default_16', day: 10, description: "Energia Loja Premium" },
  { id: 'default_17', day: 10, description: "Energia Loja Realme" },
  { id: 'default_18', day: 10, description: "Energia Loja Xv (nova)" },
  { id: 'default_19', day: 10, description: "Energia Loja Xv (velha)" },
  { id: 'default_20', day: 10, description: "Energia Miori" },
  { id: 'default_21', day: 10, description: "Influenciador Gabriel" },
  { id: 'default_22', day: 10, description: "Internet Kassouf" },
  { id: 'default_23', day: 10, description: "Internet Miori" },
  { id: 'default_24', day: 10, description: "Internet Premium" },
  { id: 'default_25', day: 10, description: "Internet Realme" },
  { id: 'default_26', day: 10, description: "Internet Xv (nova)" },
  { id: 'default_27', day: 10, description: "Internet Xv (velha)" },
  { id: 'default_28', day: 10, description: "Marketing Comercio Central" },
  { id: 'default_29', day: 10, description: "Mensalidade Canva" },
  { id: 'default_30', day: 10, description: "Mensalidade Estacionamento" },
  { id: 'default_31', day: 10, description: "Mensalidade Tim Familia" },
  { id: 'default_32', day: 10, description: "Mesalidade Odoo" },
  { id: 'default_33', day: 10, description: "Mesalidade Odoo complemento" },
  { id: 'default_34', day: 10, description: "Recarga Celulares Corporativo" },
  { id: 'default_35', day: 10, description: "Semae Xv (velha)" },
  { id: 'default_36', day: 15, description: "IPTU Loja Dom Pedro", months: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'default_37', day: 15, description: "Pensão Marineusa" },
  { id: 'default_38', day: 20, description: "Acipi Filipe" },
  { id: 'default_39', day: 20, description: "Aluguel Miori" },
  { id: 'default_40', day: 20, description: "Cartão de Crédito Jack" },
  { id: 'default_41', day: 20, description: "Consorcio Embracom" },
  { id: 'default_42', day: 20, description: "Impostos - Darf - FGTS - Simples" },
  { id: 'default_43', day: 20, description: "Mei Dark Morellato" },
  { id: 'default_44', day: 20, description: "Mensalidade Advogado Ediberto" },
  { id: 'default_45', day: 20, description: "Mensalidade Hostmundo" },
  { id: 'default_46', day: 20, description: "Mensalidade Paymobi" },
  { id: 'default_47', day: 20, description: "Pagamento Vale Funcionários" },
  { id: 'default_48', day: 20, description: "Priscila Influencer" },
  { id: 'default_49', day: 25, description: "Aluguel Dom Pedro" },
  { id: 'default_50', day: 25, description: "Aluguel Xv (nova)" },
  { id: 'default_51', day: 25, description: "Aluguel Xv (velha)" },
  { id: 'default_52', day: 25, description: "Mensalidade Tique Taque" },
  { id: 'default_53', day: 25, description: "Recebeimento Aluguel Americana" },
  { id: 'default_54', day: 25, description: "Vale Transporte Funcionários" },
  { id: 'default_55', day: 27, description: "Vale Alimentação Funcionários" }
];

export const CHECKLIST_DOC_ID = 'global_checklist_v1';

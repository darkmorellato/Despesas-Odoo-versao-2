import type { StoreName, CategoryName, FixedNotification } from '@/shared/types';

// NOTA: não existe mais senha de administrador no cliente.
// Validations consultam o Firestore (authService.validateAnyAdminPassword).

export const CATEGORIES_LIST: CategoryName[] = [
  "Despesa",
  "Despesa Fixa",
  "Despesa Jack",
  "Impostos",
  "Requisição",
  "Salário",
  "Vale (Adiantamento)",
  "Vale Alimentação",
  "Vale Transporte"
];

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
  "Dom Pedro II": "./images/dompedro.png",
  "Realme": "./images/realme.png",
  "Xv de Novembro": "./images/xv.png",
  "Premium": "./images/premium.png",
  "Kassouf": "./images/kassouf.png",
  "default": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='1.5'%3E%3Cpath d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/%3E%3Cpolyline points='9 22 9 12 15 12 15 22'/%3E%3C/svg%3E"
};

export const FIXED_NOTIFICATIONS_DEFAULT: FixedNotification[] = [
  // ==========================================
  // --- DIA 05 ---
  // ==========================================
  { id: "default_1", day: 5, description: "Aluguel Loja Premium" },
  { id: "default_2", day: 5, description: "Contabilidade Colorado" },
  { id: "default_3", day: 5, description: "Escola Wendell" },
  { id: "default_4", day: 5, description: "Faculdade Filipe" },
  { id: "default_5", day: 5, description: "Internet Dom Pedro Claro" },
  { id: "default_6", day: 5, description: "Material Fabricio" },
  { id: "default_7", day: 5, description: "Mensalidade Fabricio" },
  { id: "default_8", day: 5, description: "Pagamento de Salários" },
  { id: "default_9", day: 5, description: "Semae Dom Pedro" },
  { id: "default_10", day: 5, description: "Semae Xv Prime" },

  // ==========================================
  // --- DIA 10 ---
  // ==========================================
  { id: "default_11", day: 10, description: "Aluguel Kassouf" },
  { id: "default_12", day: 10, description: "Aluguel Realme" },
  { id: "default_13", day: 10, description: "Comercio Central" },
  { id: "default_14", day: 10, description: "Condominio Kassouf" },
  { id: "default_15", day: 10, description: "Condominio Miori ap 131" },
  { id: "default_16", day: 10, description: "Condominio Miori ap 82" },
  { id: "default_17", day: 10, description: "Energia Dom Pedro" },
  { id: "default_18", day: 10, description: "Energia Kassouf" },
  { id: "default_19", day: 10, description: "Energia Miori ap 131" },
  { id: "default_20", day: 10, description: "Energia Miori ap 82" },
  { id: "default_21", day: 10, description: "Energia Premium" },
  { id: "default_22", day: 10, description: "Energia Realme" },
  { id: "default_23", day: 10, description: "Energia Xv Prime" },
  { id: "default_24", day: 10, description: "Influenciador Gabriel" },
  { id: "default_25", day: 10, description: "Internet Dom Pedro Vivo" },
  { id: "default_26", day: 10, description: "Internet Kassouf" },
  { id: "default_27", day: 10, description: "Internet Miori ap 131" },
  { id: "default_28", day: 10, description: "Internet Premium" },
  { id: "default_29", day: 10, description: "Internet Realme" },
  { id: "default_30", day: 10, description: "Internet Xv Prime" },
  { id: "default_31", day: 10, description: "Mensalidade Estacionamento" },
  { id: "default_32", day: 10, description: "Mensalidade Odoo" },
  { id: "default_33", day: 10, description: "Mensalidade Tim Familia" },
  { id: "default_34", day: 10, description: "Recarga Celulares Corporativo" },

  // ==========================================
  // --- DIA 15 ---
  // ==========================================
  { id: "default_35", day: 15, description: "Pensão Marineusa" },

  // ==========================================
  // --- DIA 20 ---
  // ==========================================
  { id: "default_36", day: 20, description: "Acipi Filipe" },
  { id: "default_37", day: 20, description: "Aluguel Miori ap 131" },
  { id: "default_38", day: 20, description: "Cartão de Crédito Jack" },
  { id: "default_39", day: 20, description: "Comgás - Débito aut." },
  { id: "default_40", day: 20, description: "Consorcio Embracom" },
  { id: "default_41", day: 20, description: "Impostos - Darf - FGTS - Simples" },
  { id: "default_42", day: 20, description: "Mei Dark Morellato" },
  { id: "default_43", day: 20, description: "Mensalidade Advogado Ediberto" },
  { id: "default_44", day: 20, description: "Mensalidade Hostmundo" },
  { id: "default_45", day: 20, description: "Mensalidade Paymobi" },
  { id: "default_46", day: 20, description: "Pagamento Vale Funcionários" },

  // ==========================================
  // --- DIA 25 ---
  // ==========================================
  { id: "default_47", day: 25, description: "Aluguel Dom Pedro" },
  { id: "default_48", day: 25, description: "Aluguel Xv Prime" },
  { id: "default_49", day: 25, description: "IPTU Dom Pedro", months: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: "default_50", day: 25, description: "Recebimento Aluguel Americana" },

  // ==========================================
  // --- DIA 27 ---
  // ==========================================
  { id: "default_51", day: 27, description: "Mensalidade Tique Taque" },
  { id: "default_52", day: 27, description: "Vale Transporte Funcionários" },

  // ==========================================
  // --- DIA 29 ---
  // ==========================================
  { id: "default_53", day: 29, description: "Vale Alimentação Funcionários" }
];

export const CHECKLIST_DOC_ID = "global_checklist_v1";

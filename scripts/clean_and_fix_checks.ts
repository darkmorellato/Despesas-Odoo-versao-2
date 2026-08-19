import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { FIXED_NOTIFICATIONS_DEFAULT } from '../src/config/constants';

const firebaseConfig = {
  apiKey: "AIzaSyBTKRckW0phSEPoDNBwpSeb6rconsokbpI",
  authDomain: "miplace-despesas.firebaseapp.com",
  projectId: "miplace-despesas",
  storageBucket: "miplace-despesas.firebasestorage.app",
  messagingSenderId: "770624075590",
  appId: "1:770624075590:web:297b8650a919818041d747",
  measurementId: "G-Z33RRM8XPD",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mapeamento de normalização de descrições legadas -> Nome oficial em constants.ts
const DESCRIPTION_MAP: Record<string, string> = {
  "Energia Loja Kassouf": "Energia Kassouf",
  "ENERGIA CPFL LOJA KASSOUF": "Energia Kassouf",
  "Energia Loja Dom Pedro": "Energia Dom Pedro",
  "ENERGIA CPFL LOJA DOM PEDRO": "Energia Dom Pedro",
  "Energia Loja Premium": "Energia Premium",
  "ENERGIA CPFL LOJA PREMIUM": "Energia Premium",
  "Energia Loja Realme": "Energia Realme",
  "ENERGIA CPFL LOJA REALME": "Energia Realme",
  "Energia Loja Xv (nova)": "Energia Xv Prime",
  "Energia Loja Xv (velha)": "Energia Xv Prime",
  "ENERGIA CPFL LOJA XV VELHA": "Energia Xv Prime",
  "ENERGIA CPFL XV NOVA": "Energia Xv Prime",
  "ENERGIA XV NOVA": "Energia Xv Prime",
  "Energia Miori": "Energia Miori ap 131",
  "ENERGIA CPFL MIORI - ALUGUEL": "Energia Miori ap 131",
  "ENERGIA CPFL MIORI - ALUGUEL (Nº 131)": "Energia Miori ap 131",
  "Energia Miori ap 82": "Energia Miori ap 82",
  "Aluguel Loja Kassouf": "Aluguel Kassouf",
  "Aluguel Loja Realme": "Aluguel Realme",
  "Aluguel Loja Dom Pedro": "Aluguel Dom Pedro",
  "Aluguel Loja Xv (nova)": "Aluguel Xv Prime",
  "Aluguel Loja Xv (velha)": "Aluguel Xv Prime",
  "ALUGUEL LOJA XV NOVA": "Aluguel Xv Prime",
  "ALUGUEL LOJA XV VELHA": "Aluguel Xv Prime",
  "Aluguel AP. MIORI": "Aluguel Miori ap 131",
  "Aluguel Miori": "Aluguel Miori ap 131",
  "Semae Loja Dom Pedro": "Semae Dom Pedro",
  "ÁGUA SEMAE LOJA DOM PEDRO": "Semae Dom Pedro",
  "Semae Loja Xv (Nova)": "Semae Xv Prime",
  "ÁGUA SEMAE LOJA XV NOVA": "Semae Xv Prime",
  "Internet Loja Dom Pedro": "Internet Dom Pedro Claro",
  "INTERNET LOJA DOM PEDRO - CLARO": "Internet Dom Pedro Claro",
  "Internet Xv (nova)": "Internet Xv Prime",
  "Internet Xv (velha)": "Internet Xv Prime",
  "INTERNET LOJA XV NOVA - CLARO": "Internet Xv Prime",
  "INTERNET LOJA XV VELHA - CLARO - DÉB. AUT.": "Internet Xv Prime",
  "Internet Xv (velha) - Débito aut.": "Internet Xv Prime",
  "Internet Loja Kassouf": "Internet Kassouf",
  "INTERNET LOJA KASSOUF - CLARO": "Internet Kassouf",
  "Internet Loja Premium": "Internet Premium",
  "INTERNET LOJA PREMIUM - VIVO": "Internet Premium",
  "Internet Loja Realme": "Internet Realme",
  "INTERNET LOJA REALME - CLARO": "Internet Realme",
  "INTERNET LOJA REALME - CLARO - DÉB. AUT.": "Internet Realme",
  "Internet Realme - Débito aut.": "Internet Realme",
  "Condominio Loja Kassouf": "Condominio Kassouf",
  "Condominio Miori": "Condominio Miori ap 131",
  "CONDOMINIO MIORI - CASA JAQUE": "Condominio Miori ap 131",
  "CONDOMINIO MIORI - (VELHO)": "Condominio Miori ap 82",
  "Marketing Comercio Central": "Comercio Central",
  "COMÉRCIO CENTRAL": "Comercio Central",
  "Mensalidade Tim Familia": "Mensalidade Tim Familia",
  "INTERNET TIM FAMÍLIA - DÉB. AUT.": "Mensalidade Tim Familia",
  "Mensalidade Tim Familia - Débito aut.": "Mensalidade Tim Familia",
  "Mesalidade Odoo": "Mensalidade Odoo",
  "MENSALIDADE ODOO": "Mensalidade Odoo",
  "Mesalidade Odoo complemento": "Mensalidade Odoo",
  "IPTU Loja Dom Pedro": "IPTU Dom Pedro",
  "IPTU LOJA DOM PEDRO": "IPTU Dom Pedro",
  "Recebeimento Aluguel Americana": "Recebimento Aluguel Americana",
  "RECEBER ALUGUEL DE AMERICANA": "Recebimento Aluguel Americana",
  "ESCOLA WENDEL": "Escola Wendell",
  "COLORADO CONTABILIDADE": "Contabilidade Colorado",
  "FACULDADE FILIPE": "Faculdade Filipe",
  "CONSÓRCIO EMBRACON": "Consorcio Embracom",
  "MEI DARK MORELATO": "Mei Dark Morellato",
  "MENSALIDADE DR. EDIBERT - ADVOGADO": "Mensalidade Advogado Ediberto",
  "MENSALIDADE DR. EDIBERTO - ADVOGADO": "Mensalidade Advogado Ediberto",
  "MENSALIDADE HOSTMUNDO": "Mensalidade Hostmundo",
  "PAGAMENTO VALE FUNCIONÁRIOS": "Pagamento Vale Funcionários",
  "VALE ALIMENTAÇÃO FUNCIONÁRIOS": "Vale Alimentação Funcionários",
  "VALE TRANSPORTE FUNCIONÁRIOS": "Vale Transporte Funcionários",
  "MATERIAL FABRICIO": "Material Fabricio",
  "MENSALIDADE FABRICIO": "Mensalidade Fabricio"
};

async function main() {
  console.log("=== FAZENDO BACKUP COMPLETO DO CHECKS NO FIRESTORE ===");
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const checksDocRef = doc(dataDoc, 'global_checklist_v1', 'checks');

  const snap = await getDoc(checksDocRef);
  const rawChecks: Record<string, boolean> = snap.exists() ? (snap.data().checks || {}) : {};

  const backupData = {
    timestamp: new Date().toISOString(),
    totalRawKeys: Object.keys(rawChecks).length,
    checks: rawChecks
  };

  const backupPath = path.resolve('./backup_checks_before_feb2026_cleanup.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup salvo em: ${backupPath}`);

  console.log("\n=== LIMPAR ANOS ANTERIORES E CONSOLIDAR DE FEV/2026 A JUL/2026 ===");

  const canonicalDescriptions = new Set(FIXED_NOTIFICATIONS_DEFAULT.map(n => n.description));
  const newChecks: Record<string, boolean> = {};

  // Months to set as PAID (Feb 2026 = 1 ... Jul 2026 = 6)
  const paidMonths2026 = [1, 2, 3, 4, 5, 6];

  // 1. Populate EXACTLY ONE entry per canonical payment for Feb 2026 to Jul 2026:
  for (const monthIdx of paidMonths2026) {
    for (const item of FIXED_NOTIFICATIONS_DEFAULT) {
      if (item.months && !item.months.includes(monthIdx + 1)) {
        continue;
      }
      const canonicalKey = `2026-${monthIdx}-${item.description}`;
      newChecks[canonicalKey] = true;
    }
  }

  // 2. For August 2026 (month 7) and later months in 2026, keep existing checks ONLY if canonical:
  for (const [key, val] of Object.entries(rawChecks)) {
    const parts = key.split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const desc = parts.slice(2).join('-');

      // Normalize description if variant
      const normalizedDesc = DESCRIPTION_MAP[desc] || desc;

      // Only process 2026 starting from August (month >= 7)
      if (year === 2026 && month >= 7) {
        if (canonicalDescriptions.has(normalizedDesc)) {
          const canonicalKey = `2026-${month}-${normalizedDesc}`;
          newChecks[canonicalKey] = val;
        }
      }
    }
  }

  await setDoc(checksDocRef, { checks: newChecks });

  console.log(`✅ Coleção 'checks' reescrita com sucesso!`);
  console.log(`   - Chaves anteriores: ${Object.keys(rawChecks).length}`);
  console.log(`   - Chaves finais consolidadas (sem duplicatas e sem anos legados): ${Object.keys(newChecks).length}`);

  // Breakdown final
  const breakdown: Record<string, number> = {};
  Object.keys(newChecks).forEach(k => {
    const parts = k.split('-');
    const ym = `${parts[0]}-${parts[1]}`;
    breakdown[ym] = (breakdown[ym] || 0) + 1;
  });

  console.log("\nDetalhamento de marcações por Mês:");
  Object.keys(breakdown).sort().forEach(ym => {
    console.log(`  Mês ${ym}: ${breakdown[ym]} pagamentos únicos pagos`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});

import { describe, it, expect } from 'vitest';
import {
  STORE_CONFIGS, STORE_GROUP_CONFIGS, STORES_LIST, GROUP_STORES_MAP, STORE_DISPLAY_ORDER,
  STORE_IMAGES, INDIVIDUAL_STORES, LEGACY_TODAS_MEMBERS, isStoreGroupName, getGroupHint,
} from './stores';
import { getStoreColorClass, getStoreBarColor, getStoreOrder } from '@/shared/utils/helpers';

const individualNames = STORE_CONFIGS.map(s => s.name as string);

describe('configuração de lojas (fonte única)', () => {
  it('nomes de lojas e grupos são únicos', () => {
    const all = [...individualNames, ...STORE_GROUP_CONFIGS.map(g => g.name as string)];
    expect(new Set(all).size).toBe(all.length);
  });

  it('a ordem de exibição das lojas é única', () => {
    const orders = STORE_CONFIGS.map(s => s.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(INDIVIDUAL_STORES).toEqual(['Dom Pedro II', 'Realme', 'Kassouf', 'Premium', 'Xv de Novembro']);
  });

  it('todo membro de grupo é uma loja cadastrada, sem repetição', () => {
    for (const g of STORE_GROUP_CONFIGS) {
      const members = g.members as readonly string[];
      expect(members.length).toBeGreaterThan(1);
      expect(new Set(members).size).toBe(members.length);
      members.forEach(m => expect(individualNames).toContain(m));
    }
  });

  it('"Todas" tem exatamente 4 empresas e NÃO inclui a Kassouf', () => {
    expect(GROUP_STORES_MAP['Todas']).toEqual(['Dom Pedro II', 'Realme', 'Xv de Novembro', 'Premium']);
    expect(GROUP_STORES_MAP['Todas']).not.toContain('Kassouf');
  });

  it('a composição antiga de "Todas" (histórico) continua com a Kassouf', () => {
    expect(LEGACY_TODAS_MEMBERS).toContain('Kassouf');
    expect(LEGACY_TODAS_MEMBERS).toHaveLength(5);
  });

  it('grupos maiores vêm antes dos menores (reconhecimento de lançamentos antigos)', () => {
    const sizes = STORE_GROUP_CONFIGS.map(g => g.members.length);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it('o seletor lista lojas individuais e depois os grupos', () => {
    expect(STORES_LIST).toEqual([
      'Dom Pedro II', 'Realme', 'Kassouf', 'Premium', 'Xv de Novembro',
      'Todas', 'Piracicaba (DP - Realme - XV)', 'Amparo (Premium - Kassouf)',
    ]);
  });

  it('toda loja tem imagem, cor, gradiente e ordem; grupos têm cor e dica', () => {
    for (const s of STORE_CONFIGS) {
      expect(STORE_IMAGES[s.name]).toBe(s.image);
      expect(getStoreColorClass(s.name)).toBe(s.badgeClass);
      expect(getStoreBarColor(s.name)).toBe(s.barGradient);
      expect(getStoreOrder(s.name)).toBe(STORE_DISPLAY_ORDER[s.name]);
    }
    for (const g of STORE_GROUP_CONFIGS) {
      expect(getStoreColorClass(g.name)).toBe(g.badgeClass);
      expect(getGroupHint(g.name)?.text).toBe(g.hint);
      expect(g.hint.length).toBeGreaterThan(0);
    }
    expect(STORE_IMAGES.default).toMatch(/^data:image\/svg/);
  });

  it('identifica grupos e lojas desconhecidas', () => {
    expect(isStoreGroupName('Todas')).toBe(true);
    expect(isStoreGroupName('Realme')).toBe(false);
    expect(getGroupHint('Realme')).toBeUndefined();
    expect(getStoreOrder('Loja Inexistente')).toBe(99);
  });
});

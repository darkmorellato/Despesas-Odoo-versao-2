/**
 * Entrada de valores monetários no formulário de lançamento (pt-BR), sem React.
 */

/**
 * Converte um texto colado no campo de valor em um número monetário,
 * interpretando o texto segundo a semântica pt-BR:
 *
 * - Contendo vírgula: os pontos são separadores de milhar e a vírgula é
 *   decimal ("1.234,56" -> 1234.56);
 * - Sem vírgula e com ponto: o ponto é decimal APENAS se houver exatamente
 *   1 ponto e até 2 dígitos depois ("1234.56" -> 1234.56, "1.234" -> 1234,
 *   "1.234.567" -> 1234567);
 * - Sem ponto e sem vírgula: mesma semântica da máscara de digitação
 *   (os dígitos são centavos, ou seja, divide por 100 — "123456" -> 1234.56),
 *   mantendo consistência com o que o usuário digita.
 *
 * Retorna `null` quando o texto não representa um número válido.
 */
export const parsePastedAmount = (raw: string): number | null => {
  let text = raw.trim().replace(/R\$/gi, '').replace(/[\s\u00A0]/g, '');
  if (!text) return null;

  const isNegative = text.startsWith('-');
  if (isNegative) text = text.slice(1);
  if (!text) return null;

  let valueStr: string;
  if (text.includes(',')) {
    // Formato pt-BR explícito: remove separadores de milhar e troca vírgula por ponto
    valueStr = text.replace(/\./g, '').replace(',', '.');
  } else if (text.includes('.')) {
    const segments = text.split('.');
    const lastSegment = segments[segments.length - 1];
    const isDecimal = segments.length === 2 && lastSegment.length <= 2;
    valueStr = isDecimal ? text : text.replace(/\./g, '');
  } else {
    // Sem separadores: aplica a mesma semântica da máscara (dígitos / 100)
    const digits = text.replace(/\D/g, '');
    if (!digits) return null;
    const value = parseInt(digits, 10) / 100;
    return isNegative ? -value : value;
  }

  const value = parseFloat(valueStr);
  if (isNaN(value)) return null;
  return isNegative ? -value : value;
};

/** Número → texto com 2 casas no padrão pt-BR ("1.234,56") */
export const formatAmountBR = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

/**
 * Máscara de digitação: só os dígitos contam e são centavos
 * ("12345" -> "123,45"). Sem dígitos devolve '' (campo limpo).
 */
export const maskAmountInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return formatAmountBR(parseFloat(digits) / 100);
};

/**
 * Texto colado → valor formatado, ou `null` quando a colagem deve seguir o
 * comportamento padrão (texto inválido, zero ou negativo).
 */
export const formatPastedAmount = (pasted: string): string | null => {
  const num = parsePastedAmount(pasted);
  return num !== null && num > 0 ? formatAmountBR(num) : null;
};

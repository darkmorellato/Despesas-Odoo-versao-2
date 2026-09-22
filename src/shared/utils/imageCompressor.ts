/**
 * Limites de tamanho para dataURLs (base64) gravados no Firestore —
 * o limite do documento é ~1 MB, então usamos ~900 KB de folga.
 */
export const MAX_DATA_URL_BYTES = 900 * 1024;

/** Converte um dataURL (base64) para o tamanho aproximado em bytes */
export const getDataUrlBytes = (dataUrl: string): number => {
  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

/**
 * Verifica se um dataURL está dentro do tamanho máximo permitido.
 *
 * @param dataUrl DataURL (base64) a validar
 * @param maxBytes Limite em bytes (padrão ~900 KB)
 * @throws Error com mensagem clara em pt-BR quando excede o limite
 */
export const assertDataUrlWithinLimit = (
  dataUrl: string,
  maxBytes: number = MAX_DATA_URL_BYTES
): void => {
  const bytes = getDataUrlBytes(dataUrl);
  if (bytes > maxBytes) {
    const kb = Math.round(bytes / 1024);
    const maxKb = Math.round(maxBytes / 1024);
    throw new Error(
      `Arquivo muito grande: ${kb} KB excede o limite de ${maxKb} KB. ` +
      'Escolha uma imagem menor ou reduza a resolução antes de enviar.'
    );
  }
};

/**
 * Comprime uma imagem do usuário (recibo/nota) para base64 compactado
 * @param file Arquivo selecionado no input
 * @param maxWidth Largura máxima (default 1200px)
 * @param maxHeight Altura máxima (default 1200px)
 * @param quality Qualidade de compressão (0.1 a 1.0)
 */
export const compressImageFile = (
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Se for PDF ou outro tipo, lê diretamente (não passa pelo canvas
    // nem pela checagem de tamanho — PDFs já são nativos e compactos)
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Tipo de arquivo não suportado. Envie uma imagem ou PDF.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensiona respeitando AMBAS as dimensões (largura E altura)
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Sem canvas 2D — valida o original antes de devolver
          assertOrReject(e.target?.result as string, resolve, reject);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Tenta exportar em webp, com fallback para jpeg
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            assertOrReject(webpData, resolve, reject);
            return;
          }
        } catch {
          // fallback
        }

        assertOrReject(canvas.toDataURL('image/jpeg', quality), resolve, reject);
      };

      img.onerror = () => reject(new Error('Erro ao carregar a imagem.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/** Valida o tamanho do dataURL e só então resolve; rejeita com erro pt-BR se exceder */
const assertOrReject = (
  dataUrl: string,
  resolve: (value: string) => void,
  reject: (reason?: unknown) => void
): void => {
  try {
    assertDataUrlWithinLimit(dataUrl);
    resolve(dataUrl);
  } catch (err) {
    reject(err);
  }
};

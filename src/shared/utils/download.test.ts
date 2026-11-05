import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadTextFile } from './download';

afterEach(() => vi.restoreAllMocks());

describe('downloadTextFile', () => {
  it('cria o Blob com o tipo, aciona o download com o nome e limpa tudo', async () => {
    let blob: Blob | null = null;
    let downloadName = '';
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => { blob = b as Blob; return 'blob:abc'; });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
      expect(document.body.contains(this)).toBe(true); // o link precisa estar no documento no momento do clique
      expect(this.href).toBe('blob:abc');
    });

    downloadTextFile('{"a":1}', 'arquivo.json', 'application/json');

    expect(click).toHaveBeenCalledTimes(1);
    expect(downloadName).toBe('arquivo.json');
    expect(blob!.type).toBe('application/json');
    expect(await blob!.text()).toBe('{"a":1}');
    expect(revoke).toHaveBeenCalledWith('blob:abc');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});

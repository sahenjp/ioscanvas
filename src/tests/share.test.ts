import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { createShareUrl, decodeShareDocument, encodeShareDocument, readCompatibleShareHash, readShareHash } from '../lib/share';

describe('share links', () => {
  it('round-trips a Japanese semantic document through a URL-safe payload', () => {
    const document = structuredClone(defaultDocument);
    document.name = '日本語の設計';

    const encoded = encodeShareDocument(document);

    expect(decodeShareDocument(encoded)).toEqual(document);
  });

  it('creates a share URL without changing its path or query', () => {
    const url = createShareUrl(defaultDocument, 'https://example.test/editor?mode=preview#old');
    const parsed = new URL(url);

    expect(parsed.pathname).toBe('/editor');
    expect(parsed.search).toBe('?mode=preview');
    expect(readShareHash(parsed.hash)).toEqual(defaultDocument);
  });

  it('rejects broken or non-document share payloads', () => {
    expect(readShareHash('#docz=broken')).toBeNull();
    expect(decodeShareDocument('')).toBeNull();
  });

  it('reads a plain M3E share payload and converts it to the semantic document', async () => {
    const payload = encodeURIComponent(JSON.stringify({
      title: 'M3E共有',
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{ id: 'text', x: 16, y: 80, axis: 'y', items: [{ id: 'title', kind: 'text', label: '内容', icon: null, variant: 'filled' }] }],
    }));

    await expect(readCompatibleShareHash(`#doc=${payload}`)).resolves.toMatchObject({ name: 'M3E共有' });
  });

  it('reads a raw-deflate M3E share payload', async () => {
    const json = JSON.stringify({
      title: '圧縮M3E共有',
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [],
    });
    const stream = new CompressionStream('deflate-raw');
    const compressed = await new Response(new Blob([json]).stream().pipeThrough(stream)).arrayBuffer();
    const bytes = new Uint8Array(compressed);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

    await expect(readCompatibleShareHash(`#docz=${encoded}`)).resolves.toMatchObject({ name: '圧縮M3E共有' });
  });
});

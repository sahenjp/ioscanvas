import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { createShareUrl, decodeShareDocument, encodeShareDocument, readShareHash } from '../lib/share';

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
});

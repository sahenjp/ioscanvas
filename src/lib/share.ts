import { parseCanvasDocument } from './document';
import type { CanvasDocument } from '../types/document';

const SHARE_PARAM = 'docz';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeShareDocument(document: CanvasDocument): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(document)));
}

export function decodeShareDocument(value: string): CanvasDocument | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(value));
    const raw: unknown = JSON.parse(json);
    return parseCanvasDocument(raw);
  } catch {
    return null;
  }
}

export function createShareUrl(document: CanvasDocument, baseUrl: string): string {
  const url = new URL(baseUrl);
  url.hash = `${SHARE_PARAM}=${encodeShareDocument(document)}`;
  return url.toString();
}

export function readShareHash(hash: string): CanvasDocument | null {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get(SHARE_PARAM);
  return value ? decodeShareDocument(value) : null;
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = window.document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  window.document.body.appendChild(textarea);
  textarea.select();
  const copied = window.document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard API unavailable');
}

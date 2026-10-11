import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const destroy = vi.fn();
const render = vi.fn(() => ({ promise: Promise.resolve() }));
const getViewport = vi.fn(({ scale }) => ({ width: 600 * scale, height: 800 * scale }));
const getDocument = vi.fn(() => ({ promise: Promise.resolve({ getPage: async () => ({ getViewport, render }), destroy }) }));

vi.mock('react-pdf', () => ({ pdfjs: { GlobalWorkerOptions: {}, getDocument: (...args) => getDocument(...args) } }));

import { isPdf, stickerImageFrom } from './stickerFile';

describe('stickerImageFrom', () => {
  const context = { fillRect: vi.fn(), fillStyle: '' };
  let canvas;

  beforeEach(() => {
    canvas = { getContext: () => context, toBlob: (cb) => cb(new Blob(['png'], { type: 'image/png' })) };
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'canvas' ? canvas : create(tag)));
    // jsdom has no File.arrayBuffer in some versions
    if (!File.prototype.arrayBuffer) File.prototype.arrayBuffer = async () => new ArrayBuffer(4);
  });

  afterEach(() => vi.restoreAllMocks());

  it('recognises a PDF by its type or its name', () => {
    expect(isPdf(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(true);
    expect(isPdf(new File(['x'], 'A.PDF', { type: '' }))).toBe(true);
    expect(isPdf(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(false);
  });

  it('returns an image untouched', async () => {
    const photo = new File(['x'], 'sticker.jpg', { type: 'image/jpeg' });
    expect(await stickerImageFrom(photo)).toBe(photo);
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('turns the first page of a PDF into a PNG of the same name, on a white background', async () => {
    const out = await stickerImageFrom(new File(['%PDF'], 'insurance.pdf', { type: 'application/pdf' }));
    expect(out).toBeInstanceOf(File);
    expect(out.name).toBe('insurance.png');
    expect(out.type).toBe('image/png');
    expect(canvas.width).toBe(1200); // 600pt page at 2x
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1200, 1600);
    expect(render).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it('shrinks a very large page so the picture stays a sensible size', async () => {
    getViewport.mockImplementation(({ scale }) => ({ width: 6000 * scale, height: 8000 * scale }));
    await stickerImageFrom(new File(['%PDF'], 'big.pdf', { type: 'application/pdf' }));
    expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(2400);
    getViewport.mockImplementation(({ scale }) => ({ width: 600 * scale, height: 800 * scale }));
  });

  it('rejects when the PDF can not be read', async () => {
    getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error('bad pdf')) });
    await expect(stickerImageFrom(new File(['nope'], 'broken.pdf', { type: 'application/pdf' }))).rejects.toThrow('bad pdf');
  });
});

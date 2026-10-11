// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  angleFromFileName,
  angleFileName,
  forgetPhoto,
  getCachedPhotos,
  getOwnVehicleIds,
  getPhotoAngle,
  photoSrc,
  rememberOwnVehicle,
  rememberPhoto,
} from './vehiclePhotos';

describe('photoSrc', () => {
  it('resolves a server-relative path against the API host', () => {
    expect(photoSrc('/uploads/vehicles/a.png')).toBe(`${import.meta.env.VITE_API_BASE_URL}/uploads/vehicles/a.png`);
  });

  it('leaves absolute, blob and data URLs alone', () => {
    expect(photoSrc('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(photoSrc('blob:abc')).toBe('blob:abc');
    expect(photoSrc('data:image/png;base64,xx')).toBe('data:image/png;base64,xx');
  });

  it('passes an empty value through', () => {
    expect(photoSrc(undefined)).toBeUndefined();
  });
});

describe('angle file names', () => {
  it('names a guided photo by its angle, keeping the extension', () => {
    expect(angleFileName('front', new File(['x'], 'IMG_1.JPG', { type: 'image/jpeg' }))).toBe('front.jpg');
    expect(angleFileName('left', { name: 'photo', type: 'image/png' })).toBe('left.png');
  });

  it('reads the angle back from a file name, or null for an extra photo', () => {
    expect(angleFromFileName('front.jpg')).toBe('front');
    expect(angleFromFileName('interior-back.png')).toBe('interior-back');
    expect(angleFromFileName('holiday.jpg')).toBeNull();
    expect(angleFromFileName(undefined)).toBeNull();
  });
});

describe('remembered photos', () => {
  it('returns nothing for a vehicle with no remembered photos', () => {
    expect(getCachedPhotos('v1')).toEqual([]);
  });

  it('remembers an uploaded photo against its vehicle', () => {
    rememberPhoto('v1', { id: 'p1', url: '/uploads/vehicles/a.png', fileName: 'a.png' }, 'front');
    expect(getCachedPhotos('v1')).toEqual([{ id: 'p1', url: '/uploads/vehicles/a.png', alt: 'Front view' }]);
    expect(getCachedPhotos('v2')).toEqual([]);
  });

  it('orders guided angles in shooting order, with extra photos last', () => {
    rememberPhoto('v1', { id: 'x', url: '/uploads/vehicles/extra.png' }, null);
    rememberPhoto('v1', { id: 'r', url: '/uploads/vehicles/right.png' }, 'right');
    rememberPhoto('v1', { id: 'f', url: '/uploads/vehicles/front.png' }, 'front');
    rememberPhoto('v1', { id: 'b', url: '/uploads/vehicles/back.png' }, 'back');

    expect(getCachedPhotos('v1').map((p) => p.id)).toEqual(['f', 'b', 'r', 'x']);
  });

  it('does not store the same photo twice', () => {
    rememberPhoto('v1', { id: 'p1', url: '/a.png' }, 'front');
    rememberPhoto('v1', { id: 'p1', url: '/a.png' }, 'front');
    expect(getCachedPhotos('v1')).toHaveLength(1);
  });

  it('ignores a photo with no URL', () => {
    rememberPhoto('v1', { id: 'p1' }, 'front');
    expect(getCachedPhotos('v1')).toEqual([]);
  });
});

describe('own vehicle ids', () => {
  it('remembers vehicles per person, without duplicates', () => {
    rememberOwnVehicle('u1', 'v1');
    rememberOwnVehicle('u1', 'v1');
    rememberOwnVehicle('u1', 'v2');
    rememberOwnVehicle('u2', 'v9');

    expect(getOwnVehicleIds('u1')).toEqual(['v1', 'v2']);
    expect(getOwnVehicleIds('u2')).toEqual(['v9']);
    expect(getOwnVehicleIds(undefined)).toEqual([]);
  });
});

describe('forgetting and looking up a remembered photo', () => {
  it('forgets one photo of a vehicle and leaves the others', () => {
    window.localStorage.clear();
    rememberPhoto('v1', { id: 'p1', url: '/a.png', fileName: 'a.png' }, 'front');
    rememberPhoto('v1', { id: 'p2', url: '/b.png', fileName: 'b.png' }, 'left');
    rememberPhoto('v2', { id: 'p3', url: '/c.png', fileName: 'c.png' });
    forgetPhoto('v1', 'p1');
    expect(getCachedPhotos('v1').map((p) => p.id)).toEqual(['p2']);
    expect(getCachedPhotos('v2').map((p) => p.id)).toEqual(['p3']);
  });

  it('does nothing for a vehicle or photo that is not remembered', () => {
    window.localStorage.clear();
    expect(() => forgetPhoto('nope', 'nothing')).not.toThrow();
    expect(() => forgetPhoto(undefined, undefined)).not.toThrow();
  });

  it('remembers which angle a photo was for, so a replacement can take its place', () => {
    window.localStorage.clear();
    rememberPhoto('v1', { id: 'p1', url: '/a.png' }, 'interior');
    rememberPhoto('v1', { id: 'p2', url: '/b.png' });
    expect(getPhotoAngle('v1', 'p1')).toBe('interior');
    expect(getPhotoAngle('v1', 'p2')).toBeNull();
    expect(getPhotoAngle('v1', 'missing')).toBeNull();
  });
});

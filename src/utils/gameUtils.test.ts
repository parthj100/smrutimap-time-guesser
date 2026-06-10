import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  convertGoogleDriveUrl,
  formatYear,
  shuffleArray,
  transformDatabaseImageToGameImage,
} from './gameUtils';

describe('calculateDistance (Haversine)', () => {
  it('is zero for identical points', () => {
    expect(calculateDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('matches the ~111 km length of one degree of latitude', () => {
    expect(calculateDistance(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });

  it('is symmetric between endpoints', () => {
    const ab = calculateDistance(40.7128, -74.006, 51.5074, -0.1278);
    const ba = calculateDistance(51.5074, -0.1278, 40.7128, -74.006);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('grows with separation', () => {
    const near = calculateDistance(0, 0, 0, 1);
    const far = calculateDistance(0, 0, 0, 10);
    expect(far).toBeGreaterThan(near);
  });
});

describe('convertGoogleDriveUrl', () => {
  it('converts the /file/d/ share form to a thumbnail URL', () => {
    expect(convertGoogleDriveUrl('https://drive.google.com/file/d/ABC123_xyz-9/view?usp=sharing'))
      .toBe('https://drive.google.com/thumbnail?id=ABC123_xyz-9&sz=s4000');
  });

  it('converts the open?id= form', () => {
    expect(convertGoogleDriveUrl('https://drive.google.com/open?id=ABC123'))
      .toBe('https://drive.google.com/thumbnail?id=ABC123&sz=s4000');
  });

  it('converts the uc?id= form', () => {
    expect(convertGoogleDriveUrl('https://drive.google.com/uc?export=view&id=ABC123'))
      .toBe('https://drive.google.com/thumbnail?id=ABC123&sz=s4000');
  });

  it('leaves non-Drive URLs untouched', () => {
    const url = 'https://images.unsplash.com/photo-123?w=800';
    expect(convertGoogleDriveUrl(url)).toBe(url);
  });

  it('passes through empty input without throwing', () => {
    expect(convertGoogleDriveUrl('')).toBe('');
  });
});

describe('formatYear', () => {
  it('labels positive years CE', () => {
    expect(formatYear(2000)).toBe('2000 CE');
  });

  it('labels negative years BCE with the absolute value', () => {
    expect(formatYear(-500)).toBe('500 BCE');
  });
});

describe('shuffleArray', () => {
  it('preserves length and membership without mutating the input', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    const shuffled = shuffleArray(original);

    expect(original).toEqual(copy); // input not mutated
    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(copy);
  });
});

describe('transformDatabaseImageToGameImage', () => {
  it('nests location fields and converts the image URL', () => {
    const row = {
      id: 'img-1',
      image_url: 'https://drive.google.com/file/d/FILEID123/view',
      year: 1955,
      location_lat: 12.34,
      location_lng: 56.78,
      location_name: 'Somewhere',
      description: 'A test image',
    };

    expect(transformDatabaseImageToGameImage(row)).toEqual({
      id: 'img-1',
      image_url: 'https://drive.google.com/thumbnail?id=FILEID123&sz=s4000',
      year: 1955,
      location: { lat: 12.34, lng: 56.78, name: 'Somewhere' },
      description: 'A test image',
    });
  });
});

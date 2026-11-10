import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { ImageStreamAnnotation } from '#~/types';
import {
  compareImageStreamTier,
  getImageStreamTier,
  getImageTierColor,
} from '#~/pages/projects/screens/spawner/imageSelector/imageTierUtils';

describe('getImageTierColor', () => {
  it.each([
    ['secure', 'blue'],
    ['Secure', 'blue'],
    ['community', 'green'],
    ['custom', 'purple'],
    ['unknown', 'grey'],
    ['toString', 'grey'],
    ['', 'grey'],
  ])('should use %s tier text to select %s', (tier, color) => {
    expect(getImageTierColor(tier)).toBe(color);
  });
});

describe('getImageStreamTier', () => {
  it.each([
    ['secure', 'secure'],
    ['community', 'community'],
    ['custom', 'custom'],
    ['unknown', 'unknown'],
    ['', 'custom'],
    ['Secure', 'secure'],
    ['SECURE', 'secure'],
    ['Community', 'community'],
    ['Custom', 'custom'],
    ['toString', 'tostring'],
    ['Red Hat provided', 'red hat provided'],
    [undefined, 'custom'],
  ])('should resolve annotation %s to %s', (annotation, expected) => {
    const image = mockImageStreamK8sResource({
      opts: { metadata: { annotations: { [ImageStreamAnnotation.NOTEBOOK_TIER]: annotation } } },
    });
    expect(getImageStreamTier(image)).toBe(expected);
    expect(image.metadata.annotations?.[ImageStreamAnnotation.NOTEBOOK_TIER]).toBe(annotation);
  });

  it('should default to custom when annotations are absent', () => {
    const image = mockImageStreamK8sResource({});
    delete image.metadata.annotations;
    expect(getImageStreamTier(image)).toBe('custom');
  });
});

describe('compareImageStreamTier', () => {
  it('should pin secure, community, custom before other tiers and preserve image order without mutating input', () => {
    const images = [
      ['custom-first', undefined, '1'],
      ['community', 'Community', '1'],
      ['secure-later', 'secure', '10'],
      ['unknown', 'unknown', '2'],
      ['standard', 'standard', '1'],
      ['alpha', 'alpha', '1'],
      ['custom-later', 'Custom', '10'],
      ['secure-first', 'Secure', '2'],
      ['secure-tied', 'SECURE', '2'],
    ].map(([name, tier, order]) =>
      mockImageStreamK8sResource({
        name,
        opts: {
          metadata: {
            annotations: {
              [ImageStreamAnnotation.NOTEBOOK_TIER]: tier,
              [ImageStreamAnnotation.IMAGE_ORDER]: order,
            },
          },
        },
      }),
    );
    const original = [...images];
    expect(images.toSorted(compareImageStreamTier).map((image) => image.metadata.name)).toEqual([
      'secure-first',
      'secure-tied',
      'secure-later',
      'community',
      'custom-first',
      'custom-later',
      'alpha',
      'standard',
      'unknown',
    ]);
    expect(images).toEqual(original);
  });
});

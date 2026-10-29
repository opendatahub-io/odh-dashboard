import { getCompatibleIdentifiers, isCompatibleWithIdentifier } from '../acceleratorCompatibility';

const resourceWithAnnotation = (annotation?: string) => ({
  metadata: {
    annotations: { 'opendatahub.io/recommended-accelerators': annotation },
  },
});

describe('getCompatibleIdentifiers', () => {
  it('should read identifiers from resource annotations without requiring a kind or spec', () => {
    expect(
      getCompatibleIdentifiers(resourceWithAnnotation('["nvidia.com/gpu", "amd.com/gpu"]')),
    ).toEqual(['nvidia.com/gpu', 'amd.com/gpu']);
  });

  it('should preserve identifier order and duplicates', () => {
    expect(
      getCompatibleIdentifiers(
        resourceWithAnnotation('["amd.com/gpu", "nvidia.com/gpu", "amd.com/gpu"]'),
      ),
    ).toEqual(['amd.com/gpu', 'nvidia.com/gpu', 'amd.com/gpu']);
  });

  it('should return an empty list when annotations are absent', () => {
    expect(getCompatibleIdentifiers({ metadata: {} })).toEqual([]);
  });

  it.each([undefined, '', '[]', '{invalid', '{}', 'null', 'true', '42', '"nvidia.com/gpu"'])(
    'should return an empty list for a missing, empty, invalid, or non-array annotation: %s',
    (annotation) => {
      expect(getCompatibleIdentifiers(resourceWithAnnotation(annotation))).toEqual([]);
    },
  );
});

describe('isCompatibleWithIdentifier', () => {
  it.each([
    ['nvidia.com/gpu', true],
    ['amd.com/gpu', true],
    ['intel.com/gpu', false],
    ['nvidia.com', false],
    ['NVIDIA.com/gpu', false],
    ['', false],
    [undefined, false],
  ])('should match the exact identifier %s: %s', (identifier, expected) => {
    expect(
      isCompatibleWithIdentifier(
        identifier,
        resourceWithAnnotation('["nvidia.com/gpu", "amd.com/gpu"]'),
      ),
    ).toBe(expected);
  });

  it('should return false when the resource is missing', () => {
    expect(isCompatibleWithIdentifier('nvidia.com/gpu')).toBe(false);
  });

  it.each([undefined, '', '{invalid', '{}', 'null', '[]'])(
    'should return false when the annotation provides no identifiers: %s',
    (annotation) => {
      expect(isCompatibleWithIdentifier('nvidia.com/gpu', resourceWithAnnotation(annotation))).toBe(
        false,
      );
    },
  );

  it('should match string entries without coercing other entries in a mixed annotation array', () => {
    const resource = resourceWithAnnotation('[1, null, "nvidia.com/gpu"]');
    expect(isCompatibleWithIdentifier('nvidia.com/gpu', resource)).toBe(true);
    expect(isCompatibleWithIdentifier('1', resource)).toBe(false);
  });
});

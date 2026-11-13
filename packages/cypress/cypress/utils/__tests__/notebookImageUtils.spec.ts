import { describe, expect, it } from '@jest/globals';
import { collectNotebookImages, requireNotebookImages } from '../notebookImageUtils';

const NOTEBOOK_IMAGE_LABEL = 'opendatahub.io/notebook-image';
const HIDDEN_IMAGE_ANNOTATION = 'opendatahub.io/notebook-image-hidden';
const OUTDATED_TAG_ANNOTATION = 'opendatahub.io/image-tag-outdated';
const DEPRECATED_ANNOTATION = 'opendatahub.io/deprecated';

const notebookStream = (
  name: string,
  options?: {
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    tags?: { name: string; annotations?: Record<string, string> }[];
  },
) => ({
  metadata: {
    name,
    labels: options?.labels ?? { [NOTEBOOK_IMAGE_LABEL]: 'true' },
    annotations: options?.annotations,
  },
  spec: {
    tags: options?.tags ?? [{ name: '3.6' }],
  },
});

describe('collectNotebookImages', () => {
  it('should exclude hidden and unlabeled notebook streams', () => {
    const { imageInfos, skipped } = collectNotebookImages([
      notebookStream('odh-trustyai-notebook', {
        annotations: { [HIDDEN_IMAGE_ANNOTATION]: 'true' },
      }),
      notebookStream('unlabeled-notebook', { labels: {} }),
      notebookStream('disabled-notebook', { labels: { [NOTEBOOK_IMAGE_LABEL]: 'false' } }),
    ]);

    expect(imageInfos).toEqual([]);
    expect(skipped).toEqual([
      'Skipping odh-trustyai-notebook: opendatahub.io/notebook-image-hidden is true',
      'Skipping unlabeled-notebook: opendatahub.io/notebook-image is not true',
      'Skipping disabled-notebook: opendatahub.io/notebook-image is not true',
    ]);
  });

  it('should keep visible and deprecated notebook streams, drop outdated tags, and ignore other names', () => {
    const { imageInfos, skipped } = collectNotebookImages([
      notebookStream('jupyter-universal-notebook', {
        tags: [
          { name: '3.6', annotations: { [OUTDATED_TAG_ANNOTATION]: 'true' } },
          { name: '3.7' },
        ],
      }),
      notebookStream('s2i-minimal-notebook', {
        annotations: { [DEPRECATED_ANNOTATION]: 'true' },
        tags: [
          { name: '3.6' },
          { name: '3.5', annotations: { [OUTDATED_TAG_ANNOTATION]: 'true' } },
        ],
      }),
      notebookStream('jupyter-rocm-pytorch', {
        labels: { [NOTEBOOK_IMAGE_LABEL]: 'true' },
        tags: [{ name: '3.6' }],
      }),
    ]);

    expect(skipped).toEqual([]);
    expect(imageInfos).toEqual([
      { image: 'jupyter-universal-notebook', versions: ['3.7'] },
      { image: 's2i-minimal-notebook', versions: ['3.6'] },
    ]);
  });
});

describe('requireNotebookImages', () => {
  it('should throw when no eligible notebook images remain', () => {
    expect(() =>
      requireNotebookImages(
        [],
        ['Skipping odh-trustyai-notebook: opendatahub.io/notebook-image-hidden is true'],
      ),
    ).toThrow(
      'No eligible notebook images found. Skipped: Skipping odh-trustyai-notebook: opendatahub.io/notebook-image-hidden is true.',
    );
  });

  it('should return the eligible images when the list is not empty', () => {
    const imageInfos = [{ image: 'jupyter-universal-notebook', versions: ['3.6', '3.7'] }];

    expect(requireNotebookImages(imageInfos, [])).toBe(imageInfos);
  });
});

import {
  mapImageStreamToBYONImage,
  mapImageStreamToImageInfo,
} from '#~/utilities/imageStreamUtils';
import {
  BYONImage,
  DisplayNameAnnotation,
  ImageStreamAnnotation,
  ImageStreamLabel,
} from '#~/types';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { ImageStreamKind } from '#~/k8sTypes';

describe('imageStreamUtils', () => {
  describe('mapImageStreamToBYONImage', () => {
    it('maps ImageStreamKind to BYONImage with all expected fields', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({});
      const result: BYONImage = mapImageStreamToBYONImage(image);

      expect(result).toEqual({
        id: 'd6a75af7-f215-47d1-a167-e1c1e78d465c',
        name: 'test-imagestream',
        // eslint-disable-next-line camelcase
        display_name: 'Test Image',
        description:
          'Jupyter notebook image with minimal dependency set to start experimenting with Jupyter environment.',
        visible: true,
        error: '',
        packages: [
          { name: 'JupyterLab', version: '3.2', visible: undefined },
          { name: 'Notebook', version: '6.4', visible: undefined },
        ],
        software: [{ name: 'Python', version: 'v3.8', visible: undefined }],
        // eslint-disable-next-line camelcase
        imported_time: '2023-06-30T15:07:35Z',
        url: 'https://github.com//opendatahub-io/notebooks/tree/main/jupyter/minimal',
        provider: undefined,
        recommendedAcceleratorIdentifiers: [],
      });
    });
  });

  it('returns correct error message when present', () => {
    const errorMsg = 'Build failed';
    const image = mockImageStreamK8sResource({
      opts: {
        status: {
          tags: [
            {
              tag: '1.2',
              items: [],
              conditions: [
                {
                  type: 'ImportSuccess',
                  status: 'False',
                  reason: 'Error',
                  message: errorMsg,
                },
              ],
            },
          ],
        },
      },
    });
    const result = mapImageStreamToBYONImage(image);
    expect(result.error).toBe(errorMsg);
  });

  it('uses fallback display_name if main display annotation is missing', () => {
    const image = mockImageStreamK8sResource({
      opts: {
        metadata: {
          annotations: {
            [DisplayNameAnnotation.DISP_NAME]: 'User Display',
          },
        },
      },
    });
    if (image.metadata.annotations) {
      delete image.metadata.annotations[ImageStreamAnnotation.DISP_NAME];
    }
    const result = mapImageStreamToBYONImage(image);
    expect(result.display_name).toBe('User Display');
  });

  it('uses metdata name when display annotations are missing', () => {
    const image = mockImageStreamK8sResource({
      opts: {
        metadata: {
          name: 'user-display',
        },
      },
    });
    if (image.metadata.annotations) {
      delete image.metadata.annotations[ImageStreamAnnotation.DISP_NAME];
      delete image.metadata.annotations[DisplayNameAnnotation.DISP_NAME];
    }
    const result = mapImageStreamToBYONImage(image);
    expect(result.display_name).toBe('user-display');
  });

  it('visible field is set to false when notebook-image label is set to false', () => {
    const image = mockImageStreamK8sResource({
      opts: {
        metadata: {
          labels: {
            [ImageStreamLabel.NOTEBOOK]: 'false',
          },
        },
      },
    });
    const result = mapImageStreamToBYONImage(image);
    expect(result.visible).toBe(false);
  });

  it('error is empty if there are no status tags', () => {
    const image = mockImageStreamK8sResource({
      opts: {
        status: { tags: [] },
      },
    });
    const result = mapImageStreamToBYONImage(image);
    expect(result.error).toBe('');
  });

  describe('mapImageStreamToImageInfo', () => {
    it('maps ImageStreamKind to ImageInfo with all expected fields', () => {
      const image = mockImageStreamK8sResource({});
      const info = mapImageStreamToImageInfo(image);

      expect(info).toEqual({
        name: 'test-imagestream',
        // eslint-disable-next-line camelcase
        display_name: 'Test Image',
        description:
          'Jupyter notebook image with minimal dependency set to start experimenting with Jupyter environment.',
        url: 'https://github.com//opendatahub-io/notebooks/tree/main/jupyter/minimal',
        order: 1,
        dockerImageRepo:
          'image-registry.openshift-image-registry.svc:5000/opendatahub/jupyter-minimal-notebook',
        error: '',
        tags: [
          {
            name: '1.2',
            default: false,
            recommended: false,
            content: {
              dependencies: [
                { name: 'JupyterLab', version: '3.2' },
                { name: 'Notebook', version: '6.4' },
              ],
              software: [{ name: 'Python', version: 'v3.8' }],
            },
          },
        ],
      });
    });

    it('order falls back to 100 if order annotation is missing', () => {
      const image = mockImageStreamK8sResource({});
      if (image.metadata.annotations) {
        delete image.metadata.annotations[ImageStreamAnnotation.IMAGE_ORDER];
      }
      const info = mapImageStreamToImageInfo(image);
      expect(info.order).toBe(100);
    });

    it('error is empty string for non-BYON images', () => {
      const image = mockImageStreamK8sResource({
        opts: {
          metadata: {
            labels: {
              ...mockImageStreamK8sResource({}).metadata.labels,
              'app.kubernetes.io/created-by': 'other',
            },
          },
        },
      });
      const info = mapImageStreamToImageInfo(image);
      expect(info.error).toBe('');
    });
  });
});

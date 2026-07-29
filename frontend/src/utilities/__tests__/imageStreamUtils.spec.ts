import {
  mapImageStreamToBYONImage,
  mapImageStreamToImageInfo,
  parseImageURL,
} from '#~/utilities/imageStreamUtils';
import {
  BYONImage,
  DisplayNameAnnotation,
  ImageStreamAnnotation,
  ImageStreamLabel,
  ImageStreamSpecTagAnnotation,
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
        provider: 'Red Hat',
        recommendedAcceleratorIdentifiers: [],
        isOOTB: true,
      });
    });

    it('should set isOOTB to false for BYON images', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({
        opts: {
          metadata: {
            labels: {
              'app.kubernetes.io/created-by': 'byon',
              'opendatahub.io/notebook-image': 'true',
            },
          },
        },
      });
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.isOOTB).toBe(false);
    });

    it('should set provider to "Red Hat" for OOTB images without creator annotation', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({});
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.provider).toBe('Red Hat');
      expect(result.isOOTB).toBe(true);
    });

    it('should use creator annotation when present for OOTB images', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({
        opts: {
          metadata: {
            annotations: {
              [ImageStreamAnnotation.CREATOR]: 'custom-provider',
            },
          },
        },
      });
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.provider).toBe('custom-provider');
    });

    it('should return empty error for OOTB images even when status has error', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({
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
                    message: 'Import failed',
                  },
                ],
              },
            ],
          },
        },
      });
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.error).toBe('');
      expect(result.isOOTB).toBe(true);
    });

    it('should use recommended tag for OOTB images when available', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({
        opts: {
          spec: {
            tags: [
              {
                name: 'first-tag',
                annotations: {
                  [ImageStreamSpecTagAnnotation.SOFTWARE]: '[{"name":"Python","version":"3.8"}]',
                  [ImageStreamSpecTagAnnotation.DEPENDENCIES]: '[]',
                },
              },
              {
                name: 'recommended-tag',
                annotations: {
                  [ImageStreamSpecTagAnnotation.SOFTWARE]: '[{"name":"Python","version":"3.11"}]',
                  [ImageStreamSpecTagAnnotation.DEPENDENCIES]:
                    '[{"name":"JupyterLab","version":"4.0"}]',
                  [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'true',
                },
              },
            ],
          },
        },
      });
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.software).toEqual([{ name: 'Python', version: '3.11' }]);
      expect(result.packages).toEqual([{ name: 'JupyterLab', version: '4.0' }]);
    });

    it('should use default tag for OOTB images when no recommended tag', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({
        opts: {
          spec: {
            tags: [
              {
                name: 'first-tag',
                annotations: {
                  [ImageStreamSpecTagAnnotation.SOFTWARE]: '[{"name":"Python","version":"3.8"}]',
                  [ImageStreamSpecTagAnnotation.DEPENDENCIES]: '[]',
                },
              },
              {
                name: 'default-tag',
                annotations: {
                  [ImageStreamSpecTagAnnotation.SOFTWARE]: '[{"name":"Python","version":"3.10"}]',
                  [ImageStreamSpecTagAnnotation.DEPENDENCIES]:
                    '[{"name":"Notebook","version":"6.5"}]',
                  [ImageStreamSpecTagAnnotation.DEFAULT]: 'true',
                },
              },
            ],
          },
        },
      });
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.software).toEqual([{ name: 'Python', version: '3.10' }]);
      expect(result.packages).toEqual([{ name: 'Notebook', version: '6.5' }]);
    });

    it('should set visible to false when OOTB image has hidden annotation', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({
        opts: {
          metadata: {
            annotations: {
              [ImageStreamAnnotation.HIDDEN]: 'true',
            },
          },
        },
      });
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.visible).toBe(false);
      expect(result.isOOTB).toBe(true);
    });

    it('should set visible to true when OOTB image has no hidden annotation', () => {
      const image: ImageStreamKind = mockImageStreamK8sResource({});
      const result: BYONImage = mapImageStreamToBYONImage(image);
      expect(result.visible).toBe(true);
      expect(result.isOOTB).toBe(true);
    });
  });

  it('returns correct error message when present for BYON images', () => {
    const errorMsg = 'Build failed';
    const image = mockImageStreamK8sResource({
      opts: {
        metadata: {
          labels: {
            'app.kubernetes.io/created-by': 'byon',
            'opendatahub.io/notebook-image': 'true',
          },
        },
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
    expect(result.isOOTB).toBe(false);
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

  it('visible field is set to false when notebook-image label is set to false for BYON images', () => {
    const image = mockImageStreamK8sResource({
      opts: {
        metadata: {
          labels: {
            [ImageStreamLabel.NOTEBOOK]: 'false',
            'app.kubernetes.io/created-by': 'byon',
          },
        },
      },
    });
    const result = mapImageStreamToBYONImage(image);
    expect(result.visible).toBe(false);
    expect(result.isOOTB).toBe(false);
  });

  it('error is empty for BYON image if there are no status tags', () => {
    const image = mockImageStreamK8sResource({
      opts: {
        metadata: {
          labels: {
            'app.kubernetes.io/created-by': 'byon',
            'opendatahub.io/notebook-image': 'true',
          },
        },
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

  describe('parseImageURL', () => {
    it('Invalid URL: space string', () => {
      const url = '     ';
      const { fullURL, host } = parseImageURL(url);
      expect(fullURL).toBe('');
      expect(host).toBeUndefined();
    });

    it('Invalid URL: no match', () => {
      const url = '/';
      const { host, tag } = parseImageURL(url);
      expect(host).toBeUndefined();
      expect(tag).toBeUndefined();
    });

    it('Invalid URL: host only', () => {
      const url = 'docker.io';
      const { host } = parseImageURL(url);
      expect(host).toBe('');
    });

    it('Invalid URL: host and repo, no image', () => {
      const url = 'docker.io/opendatahub';
      const { host } = parseImageURL(url);
      expect(host).toBe('');
    });

    it('Valid URL with spaces on both sides', () => {
      const url = '  docker.io/library/mysql:test  ';
      const { fullURL, host, tag } = parseImageURL(url);
      expect(fullURL).toBe('docker.io/library/mysql:test');
      expect(host).toBe('docker.io');
      expect(tag).toBe('test');
    });

    it('Docker container URL without tag', () => {
      const url = 'docker.io/library/mysql';
      const { host, tag } = parseImageURL(url);
      expect(host).toBe('docker.io');
      expect(tag).toBeUndefined();
    });

    it('Docker container URL with tag', () => {
      const url = 'docker.io/library/mysql:test-tag';
      const { host, tag } = parseImageURL(url);
      expect(host).toBe('docker.io');
      expect(tag).toBe('test-tag');
    });

    it('OpenShift internal registry URL without tag', () => {
      const url =
        'image-registry.openshift-image-registry.svc:5000/opendatahub/s2i-minimal-notebook';
      const { host, tag } = parseImageURL(url);
      expect(host).toBe('image-registry.openshift-image-registry.svc:5000');
      expect(tag).toBeUndefined();
    });

    it('OpenShift internal registry URL with tag', () => {
      const url =
        'image-registry.openshift-image-registry.svc:5000/opendatahub/s2i-minimal-notebook:v0.3.0-py36';
      const { host, tag } = parseImageURL(url);
      expect(host).toBe('image-registry.openshift-image-registry.svc:5000');
      expect(tag).toBe('v0.3.0-py36');
    });

    it('Quay URL with port and tag', () => {
      const url = 'quay.io:443/opendatahub/odh-dashboard:main-55e19fa';
      const { host, tag } = parseImageURL(url);
      expect(host).toBe('quay.io:443');
      expect(tag).toBe('main-55e19fa');
    });
  });
});

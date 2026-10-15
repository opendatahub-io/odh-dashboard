import { mockNotebookK8sResource } from '#~/__mocks__';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { getNotebookImageData } from '#~/pages/projects/screens/detail/notebooks/useNotebookImageData';
import {
  NotebookImageAvailability,
  NotebookImageStatus,
} from '#~/pages/projects/screens/detail/notebooks/const';
import { ImageStreamAnnotation, ImageStreamSpecTagAnnotation } from '#~/types';

const getRecommendedNotebookImageData = (deprecated?: string) => {
  const buildCommit = 'recommended-build-commit';
  const notebook = mockNotebookK8sResource({
    image: 'test-imagestream:1.2',
    lastImageSelection: 'test-imagestream:1.2',
    opts: {
      metadata: {
        annotations: {
          'notebooks.opendatahub.io/last-image-version-git-commit-selection': buildCommit,
        },
      },
    },
  });
  const imageStream = mockImageStreamK8sResource({
    opts: {
      metadata: {
        annotations:
          deprecated === undefined
            ? {}
            : {
                [ImageStreamAnnotation.DEPRECATED]: deprecated,
              },
      },
      spec: {
        tags: [
          {
            name: '1.2',
            annotations: {
              'opendatahub.io/notebook-build-commit': buildCommit,
              [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'true',
            },
          },
        ],
      },
    },
  });

  return getNotebookImageData(notebook, [imageStream]);
};

describe('getNotebookImageData', () => {
  it('should return image data when image stream exists and image version exists with internal registry', () => {
    const notebook = mockNotebookK8sResource({
      image:
        'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
      lastImageSelection: 'jupyter-datascience-notebook:1.2',
    });
    const images = [
      mockImageStreamK8sResource({
        imageTag:
          'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
        name: 'jupyter-datascience-notebook',
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageStatus !== NotebookImageStatus.DELETED && result?.imageAvailability).toBe(
      NotebookImageAvailability.ENABLED,
    );
  });

  it('should return image data when image stream exists and image version exists without internal registry', () => {
    const imageName = 'jupyter-datascience-notebook';
    const tagName = '2024.1';
    const notebook = mockNotebookK8sResource({
      image: `image-registry.openshift-image-registry.svc:5000/opendatahub/${imageName}:${tagName}`,
      lastImageSelection: `${imageName}:${tagName}`,
    });
    const images = [
      mockImageStreamK8sResource({
        imageTag:
          'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
        tagName,
        name: imageName,
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageStatus !== NotebookImageStatus.DELETED && result?.imageAvailability).toBe(
      NotebookImageAvailability.ENABLED,
    );
  });

  it('should return the right image if multiple ImageStreams have the same image with internal registry', () => {
    const displayName = 'Jupyter Data Science Notebook';
    const notebook = mockNotebookK8sResource({
      image:
        'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
      lastImageSelection: 'jupyter-datascience-notebook:1.2',
    });
    const images = [
      mockImageStreamK8sResource({
        imageTag:
          'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
        name: 'jupyter-datascience-notebook',
        displayName,
      }),
      mockImageStreamK8sResource({
        imageTag:
          'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
        name: 'custom-notebook',
        displayName: 'Custom Notebook',
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageDisplayName).toBe(displayName);
  });

  it('should return the right image if multiple ImageStreams have the same tag without internal registry', () => {
    const imageName = 'jupyter-datascience-notebook';
    const tagName = '2024.1';
    const displayName = 'Jupyter Data Science Notebook';
    const notebook = mockNotebookK8sResource({
      image: `image-registry.openshift-image-registry.svc:5000/opendatahub/${imageName}:${tagName}`,
      lastImageSelection: `${imageName}:${tagName}`,
    });
    const images = [
      mockImageStreamK8sResource({
        imageTag:
          'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
        tagName,
        name: 'code-server',
        displayName: 'Code Server',
      }),
      mockImageStreamK8sResource({
        imageTag:
          'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
        tagName,
        name: imageName,
        displayName,
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageDisplayName).toBe(displayName);
  });

  it('should return image data when image stream exists and image version does not exist', () => {
    const notebook = mockNotebookK8sResource({
      image:
        'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
    });
    const images = [
      mockImageStreamK8sResource({
        imageTag: 'quay.io/opendatahub/notebooks@sha256:invalid',
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageStatus).toBe(NotebookImageStatus.DELETED);
  });

  it('should fail when custom image shows unexpected Deleted flag', () => {
    const imageName = 'jupyter-datascience-notebook';
    const tagName = '2024.1';
    const notebook = mockNotebookK8sResource({
      lastImageSelection: `${imageName}:${tagName}`,
      image: `quay.io/opendatahub/${imageName}:${tagName}`,
    });
    const images = [
      mockImageStreamK8sResource({
        tagName,
        name: imageName,
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageStatus !== NotebookImageStatus.DELETED && result?.imageAvailability).toBe(
      NotebookImageAvailability.ENABLED,
    );
  });

  it('should test an image defined via sha', () => {
    const imageName = 'jupyter-datascience-notebook';
    const imageSha = 'sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75';
    const notebook = mockNotebookK8sResource({
      lastImageSelection: `${imageName}:1.2`,
      image: `quay.io/opendatahub/${imageName}@${imageSha}`,
    });
    const images = [
      mockImageStreamK8sResource({
        imageTag: `quay.io/opendatahub/${imageName}@${imageSha}`,
        name: imageName,
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageStatus !== NotebookImageStatus.DELETED && result?.imageAvailability).toBe(
      NotebookImageAvailability.ENABLED,
    );
  });

  it('should retain the latest version status for a deprecated ImageStream', () => {
    const result = getRecommendedNotebookImageData('true');

    expect(result?.imageStatus).toBe(NotebookImageStatus.LATEST);
  });

  it('should retain the latest status when the ImageStream deprecation annotation is absent', () => {
    const result = getRecommendedNotebookImageData();

    expect(result?.imageStatus).toBe(NotebookImageStatus.LATEST);
  });

  it('should retain the latest status when the ImageStream deprecation annotation is false', () => {
    const result = getRecommendedNotebookImageData('false');

    expect(result?.imageStatus).toBe(NotebookImageStatus.LATEST);
  });
});

import { mockNotebookK8sResource } from '~/__mocks__';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { getNotebookImageData } from '~/pages/projects/screens/detail/notebooks/useNotebookImageData';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';

describe('getNotebookImageData', () => {
  it('should return image data when image stream exists and image version exists', () => {
    const notebook = mockNotebookK8sResource({
      image:
        'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
    });
    const images = [
      mockImageStreamK8sResource({
        imageTag:
          'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
      }),
    ];
    const result = getNotebookImageData(notebook, images);
    expect(result?.imageAvailability).toBe(NotebookImageAvailability.ENABLED);
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
    expect(result?.imageAvailability).toBe(NotebookImageAvailability.DELETED);
  });
});

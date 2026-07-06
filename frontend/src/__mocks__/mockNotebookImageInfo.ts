/* eslint-disable camelcase */
import { ImageInfo } from '#~/types';

export const mockNotebookImageInfo = (): ImageInfo[] => [
  {
    name: 'code-server-notebook',
    description:
      'code-server workbench allows users to code, build, and collaborate on projects directly from web.',
    url: 'https://github.com/opendatahub-io/notebooks/tree/main/codeserver',
    display_name: 'code-server',
    tags: [
      {
        content: {
          software: [
            {
              name: 'Python',
              version: 'v3.9',
            },
          ],
          dependencies: [
            {
              name: 'code-server',
              version: '4.11',
            },
          ],
        },
        name: '2023.1',
        recommended: false,
        default: false,
      },
      {
        content: {
          software: [
            {
              name: 'Python',
              version: 'v3.9',
            },
          ],
          dependencies: [
            {
              name: 'code-server',
              version: '4.16',
            },
          ],
        },
        name: '2023.2',
        recommended: true,
        default: false,
      },
    ],
    order: 8,
    dockerImageRepo:
      'image-registry.openshift-image-registry.svc:5000/opendatahub/code-server-notebook',
  },
  {
    name: 'custom-test-with-accelerators',
    description: '',
    url: 'quay.io/opendatahub/workbench-images:jupyter-minimal-ubi8-python-3.8-pr-89',
    display_name: 'Test with accelerators',
    tags: [
      {
        content: {
          software: [],
          dependencies: [],
        },
        name: 'jupyter-minimal-ubi8-python-3.8-pr-89',
        recommended: false,
        default: false,
      },
    ],
    order: 100,
    dockerImageRepo:
      'image-registry.openshift-image-registry.svc:5000/opendatahub/custom-test-with-accelerators',
  },

  {
    name: 'custom-image',
    description: '',
    url: 'quay.io/pnaik/custom-image',
    display_name: 'image',
    tags: [
      {
        content: {
          software: [],
          dependencies: [],
        },
        name: 'latest',
        recommended: false,
        default: false,
      },
    ],
    order: 100,
    dockerImageRepo: 'image-registry.openshift-image-registry.svc:5000/opendatahub/custom-image',
  },
];

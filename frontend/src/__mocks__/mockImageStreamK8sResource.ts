import * as _ from 'lodash-es';
import { ImageStreamKind } from '#~/k8sTypes';
import { RecursivePartial } from '#~/typeHelpers';
import { ImageStreamAnnotation, ImageStreamSpecTagAnnotation } from '#~/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  imageTag?: string;
  tagName?: string;
  opts?: RecursivePartial<ImageStreamKind>;
};

export const mockImageStreamK8sResource = ({
  name = 'test-imagestream',
  namespace = 'test-project',
  displayName = 'Test Image',
  imageTag = 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
  tagName = '1.2',
  opts = {},
}: MockResourceConfigType): ImageStreamKind =>
  _.mergeWith(
    {
      apiVersion: 'image.openshift.io/v1',
      kind: 'ImageStream',
      metadata: {
        name,
        namespace,
        uid: 'd6a75af7-f215-47d1-a167-e1c1e78d465c',
        resourceVersion: '1579802',
        generation: 2,
        creationTimestamp: '2023-06-30T15:07:35Z',
        labels: {
          'component.opendatahub.io/name': 'notebooks',
          'opendatahub.io/component': 'true',
          'opendatahub.io/notebook-image': 'true',
        },
        annotations: {
          'kfctl.kubeflow.io/kfdef-instance': 'opendatahub.opendatahub',
          'opendatahub.io/notebook-image-desc':
            'Jupyter notebook image with minimal dependency set to start experimenting with Jupyter environment.',
          'opendatahub.io/notebook-image-name': displayName,
          'opendatahub.io/notebook-image-order': '1',
          'opendatahub.io/notebook-image-url':
            'https://github.com//opendatahub-io/notebooks/tree/main/jupyter/minimal',
          'openshift.io/image.dockerRepositoryCheck': '2023-06-30T15:07:36Z',
        },
      },
      spec: {
        lookupPolicy: {
          local: true,
        },
        tags: [
          {
            name: tagName,
            annotations: {
              'opendatahub.io/notebook-python-dependencies':
                '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
              'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
            },
            from: {
              kind: 'DockerImage',
              name: imageTag,
            },
          },
        ],
      },
      status: {
        dockerImageRepository:
          'image-registry.openshift-image-registry.svc:5000/opendatahub/jupyter-minimal-notebook',
        tags: [
          {
            tag: '1.2',
            items: [
              {
                created: '2023-06-30T15:07:36Z',
                dockerImageReference:
                  'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                image: imageTag,
                generation: 2,
              },
            ],
          },
        ],
      },
    } as ImageStreamKind,
    opts,
    // Make sure tags can be overridden
    (defaultValue, optsValue) =>
      // Allow for emptying the array
      Array.isArray(optsValue) && optsValue.length === 0 ? [] : undefined,
  );

export const mockImageStreamK8sResourceList = (): ImageStreamKind[] => [
  mockImageStreamK8sResource({
    name: 'code-server-notebook',
    displayName: 'code-server',
    opts: {
      metadata: {
        annotations: {
          [ImageStreamAnnotation.DESC]:
            'code-server workbench allows users to code, build, and collaborate on projects directly from web.',
          [ImageStreamAnnotation.DISP_NAME]: 'code-server',
          [ImageStreamAnnotation.URL]:
            'https://github.com/opendatahub-io/notebooks/tree/main/codeserver',
          [ImageStreamAnnotation.IMAGE_ORDER]: '8',
        },
      },
      spec: {
        tags: [
          {
            name: '2023.1',
            annotations: {
              [ImageStreamSpecTagAnnotation.SOFTWARE]: '[{"name":"Python","version": "v3.9"}]',
              [ImageStreamSpecTagAnnotation.DEPENDENCIES]:
                '[{"name":"code-server","version":"4.11"}]',
              [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'false',
              [ImageStreamSpecTagAnnotation.DEFAULT]: 'false',
            },
          },
          {
            name: '2023.2',
            annotations: {
              [ImageStreamSpecTagAnnotation.SOFTWARE]: '[{"name":"Python","version": "v3.9"}]',
              [ImageStreamSpecTagAnnotation.DEPENDENCIES]:
                '[{"name":"code-server","version":"4.16"}]',
              [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'false',
              [ImageStreamSpecTagAnnotation.DEFAULT]: 'false',
            },
          },
        ],
      },
      status: {
        dockerImageRepository:
          'image-registry.openshift-image-registry.svc:5000/opendatahub/code-server-notebook',
        tags: [{ tag: '2023.1' }, { tag: '2023.2' }],
      },
    },
  }),

  mockImageStreamK8sResource({
    name: 'custom-test-with-accelerators',
    displayName: 'Test with accelerators',
    opts: {
      metadata: {
        annotations: {
          [ImageStreamAnnotation.DESC]: '',
          [ImageStreamAnnotation.DISP_NAME]: 'Test with accelerators',
          [ImageStreamAnnotation.URL]:
            'quay.io/opendatahub/workbench-images:jupyter-minimal-ubi8-python-3.8-pr-89',
          [ImageStreamAnnotation.IMAGE_ORDER]: '100',
        },
      },
      spec: {
        tags: [
          {
            name: 'jupyter-minimal-ubi8-python-3.8-pr-89',
            annotations: {
              [ImageStreamSpecTagAnnotation.SOFTWARE]: JSON.stringify([]),
              [ImageStreamSpecTagAnnotation.DEPENDENCIES]: JSON.stringify([]),
              [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'false',
              [ImageStreamSpecTagAnnotation.DEFAULT]: 'false',
            },
          },
        ],
      },
      status: {
        dockerImageRepository:
          'image-registry.openshift-image-registry.svc:5000/opendatahub/custom-test-with-accelerators',
        tags: [{ tag: 'jupyter-minimal-ubi8-python-3.8-pr-89' }],
      },
    },
  }),

  mockImageStreamK8sResource({
    name: 'custom-image',
    displayName: 'image',
    opts: {
      metadata: {
        annotations: {
          [ImageStreamAnnotation.DESC]: '',
          [ImageStreamAnnotation.DISP_NAME]: 'image',
          [ImageStreamAnnotation.URL]: 'quay.io/pnaik/custom-image',
          [ImageStreamAnnotation.IMAGE_ORDER]: '100',
        },
      },
      spec: {
        tags: [
          {
            name: 'latest',
            annotations: {
              [ImageStreamSpecTagAnnotation.SOFTWARE]: JSON.stringify([]),
              [ImageStreamSpecTagAnnotation.DEPENDENCIES]: JSON.stringify([]),
              [ImageStreamSpecTagAnnotation.RECOMMENDED]: 'false',
              [ImageStreamSpecTagAnnotation.DEFAULT]: 'false',
            },
          },
        ],
      },
      status: {
        dockerImageRepository:
          'image-registry.openshift-image-registry.svc:5000/opendatahub/custom-image',
        tags: [{ tag: 'latest' }],
      },
    },
  }),
];

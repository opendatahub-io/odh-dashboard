import _ from 'lodash';
import { ImageStreamKind } from '~/k8sTypes';
import { RecursivePartial } from '~/typeHelpers';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  opts?: RecursivePartial<ImageStreamKind>;
};

export const mockImageStreamK8sResource = ({
  name = 'test-imagestream',
  namespace = 'test-project',
  displayName = 'Test Image',
  opts = {},
}: MockResourceConfigType): ImageStreamKind =>
  _.merge(
    {
      apiVersion: 'image.openshift.io/v1',
      kind: 'ImageStream',
      metadata: {
        name: name,
        namespace: namespace,
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
            name: '1.2',
            annotations: {
              'opendatahub.io/notebook-python-dependencies':
                '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
              'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
            },
            from: {
              kind: 'DockerImage',
              name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
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
                image: 'sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                generation: 2,
              },
            ],
          },
        ],
      },
    } as ImageStreamKind,
    opts,
  );

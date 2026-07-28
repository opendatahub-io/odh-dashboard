import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import {
  mockCustomSecretK8sResource,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStorageClassList,
} from '@odh-dashboard/internal/__mocks__';
import { mockConfigMap } from '@odh-dashboard/internal/__mocks__/mockConfigMap';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/internal/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import type { HardwareProfileKind, PodKind } from '@odh-dashboard/k8s-core';
import type { NotebookKind } from '@odh-dashboard/internal/k8sTypes';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  ConfigMapModel,
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  StorageClassModel,
  HardwareProfileModel,
} from '../../../../utils/models';

type MockNotebookConfig = Parameters<typeof mockNotebookK8sResource>[0];

export type HandlersProps = {
  isEmpty?: boolean;
  mockPodList?: PodKind[];
  envFrom?: MockNotebookConfig['envFrom'];
  disableProjectScoped?: boolean;
  notebooks?: NotebookKind[];
  hardwareProfiles?: {
    global: HardwareProfileKind[];
    project: HardwareProfileKind[];
  };
  pvcSize?: string;
};

export const initIntercepts = ({
  isEmpty = false,
  envFrom,
  mockPodList = [mockPodK8sResource({})],
  disableProjectScoped = true,
  notebooks = [
    mockNotebookK8sResource({
      lastImageSelection: 'test-imagestream:1.2',
      envFrom,
      opts: {
        metadata: {
          name: 'test-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
          annotations: {
            'opendatahub.io/image-display-name': 'Test image',
          },
        },
      },
    }),
    mockNotebookK8sResource({ name: 'another-test', displayName: 'Another Notebook' }),
    mockNotebookK8sResource({
      name: 'outdated-notebook',
      displayName: 'Outdated Notebook',
      image: 'test-10:2023.1',
      lastImageSelection: 'test-10:2023.1',
      envFrom,
      opts: {
        metadata: {
          name: 'outdated-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
          annotations: {
            'opendatahub.io/image-display-name': 'Outdated image',
            'notebooks.opendatahub.io/last-image-version-git-commit-selection': '1234',
          },
        },
      },
    }),
    mockNotebookK8sResource({
      name: 'latest-notebook',
      displayName: 'Latest Notebook',
      image: 'test-10:2024.2',
      lastImageSelection: 'test-10:2024.2',
      envFrom,
      opts: {
        metadata: {
          name: 'latest-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
          annotations: {
            'opendatahub.io/image-display-name': 'Latest image',
            'notebooks.opendatahub.io/last-image-version-git-commit-selection': '12345',
          },
        },
      },
    }),
    mockNotebookK8sResource({
      name: 'mismatch-commit-notebook',
      displayName: 'Deprecated Notebook',
      image: 'test-10:2023.1',
      lastImageSelection: 'test-10:2023.1',
      envFrom,
      opts: {
        metadata: {
          name: 'mismatch-commit-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
          annotations: {
            'notebooks.opendatahub.io/last-image-version-git-commit-selection': '123',
            'opendatahub.io/image-display-name': 'Outdated image',
          },
        },
      },
    }),
    mockNotebookK8sResource({
      name: 'mismatch-commit-byon-notebook',
      displayName: 'BYON Notebook',
      image: 'test-6:2024.2',
      lastImageSelection: 'test-6:2024.2',
      envFrom,
      opts: {
        metadata: {
          name: 'mismatch-commit-byon-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
        },
      },
    }),
  ],
  hardwareProfiles,
  pvcSize,
}: HandlersProps): void => {
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableProjectScoped,
      pvcSize,
    }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(PodModel, mockK8sResourceList(mockPodList));
  cy.interceptK8sList(
    ImageStreamModel,
    mockK8sResourceList([
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-1',
        displayName: 'Test image 1',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-2',
        displayName: 'Test image 2',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-3',
        displayName: 'Test image 3',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-4',
        displayName: 'Test image 4',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-5',
        displayName: 'Test image 5',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-6',
        displayName: 'Test image 6',
        opts: {
          metadata: {
            name: 'test-6',
            labels: {
              'component.opendatahub.io/name': 'notebooks',
              'opendatahub.io/component': 'true',
              'opendatahub.io/notebook-image': 'true',
              'app.kubernetes.io/created-by': 'byon',
            },
          },
          spec: {
            tags: [
              {
                name: '2024.2',
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
                tag: '2024.2',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
            ],
          },
        },
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-7',
        displayName: 'Test image 7',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-8',
        displayName: 'Test image 8',
        opts: {
          spec: {
            tags: [
              {
                name: '2023.1',
                annotations: {
                  'opendatahub.io/workbench-image-recommended': 'false',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '1234',
                },
                from: {
                  kind: 'DockerImage',
                  name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                },
              },
              {
                name: '2024.2',
                annotations: {
                  'opendatahub.io/workbench-image-recommended': 'true',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '12345',
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
                tag: '2023.1',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
              {
                tag: '2024.2',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
            ],
          },
        },
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-9',
        displayName: 'Test image 9',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-10',
        displayName: 'Test image 10',
        opts: {
          spec: {
            tags: [
              {
                name: '2023.1',
                annotations: {
                  'opendatahub.io/image-tag-outdated': 'true',
                  'opendatahub.io/workbench-image-recommended': 'false',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '1234',
                },
                from: {
                  kind: 'DockerImage',
                  name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                },
              },
              {
                name: '2024.2',
                annotations: {
                  'opendatahub.io/workbench-image-recommended': 'true',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '12345',
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
                tag: '2023.1',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
              {
                tag: '2024.2',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
            ],
          },
        },
      }),
      mockImageStreamK8sResource({
        name: 'test-10stream',
        namespace: 'test-project',
        tagName: '1.22',
        displayName: 'Project-scoped test image',
      }),
    ]),
  );
  cy.interceptK8s(
    { model: SecretModel, ns: 'test-project', name: 'secret' },
    mockCustomSecretK8sResource({
      name: 'secret',
      namespace: 'test-project',
      data: { test: 'c2RzZA==' },
    }),
  );
  cy.interceptK8s(
    'PUT',
    { model: SecretModel, ns: 'test-project', name: 'secret' },
    mockCustomSecretK8sResource({
      name: 'secret',
      namespace: 'test-project',
      data: { test: 'c2RzZA==' },
    }),
  );
  cy.interceptK8s(SecretModel, mockSecretK8sResource({ name: 'aws-connection-db-1' }));
  cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('stopWorkbench');
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' }));
  cy.interceptK8sList(
    {
      model: NotebookModel,
      ns: 'test-project',
    },
    mockK8sResourceList(isEmpty ? [] : notebooks),
  );
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    PVCModel,
    mockK8sResourceList([mockPVCK8sResource({ name: 'test-storage-1' })]),
  );

  cy.interceptK8s('POST', ConfigMapModel, mockConfigMap({})).as('createConfigMap');

  cy.interceptK8s('POST', NotebookModel, mockNotebookK8sResource({})).as('createWorkbench');

  if (hardwareProfiles) {
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList(hardwareProfiles.global),
    ).as('globalHardwareProfiles');

    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'test-project' },
      mockK8sResourceList(hardwareProfiles.project),
    ).as('projectHardwareProfiles');
  } else {
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList(mockGlobalScopedHardwareProfiles),
    ).as('globalHardwareProfiles');

    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'test-project' },
      mockK8sResourceList(mockProjectScopedHardwareProfiles),
    ).as('projectHardwareProfiles');
  }
};

/* eslint-disable react/jsx-no-constructed-context-values */
import React from 'react';
import { StoryFn, Meta, StoryObj } from '@storybook/react';
import { DefaultBodyType, MockedRequest, rest, RestHandler } from 'msw';
import { Route } from 'react-router-dom';
import { within } from '@testing-library/react';
import {
  mockRouteK8sResource,
  mockRouteK8sResourceModelServing,
} from '~/__mocks__/mockRouteK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import ProjectDetailsContextProvider from '~/pages/projects/ProjectDetailsContext';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockDataConnection } from '~/__mocks__/mockDataConnection';
import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import useDetectUser from '~/utilities/useDetectUser';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import ProjectDetails from '~/pages/projects/screens/detail/ProjectDetails';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { StackComponent } from '~/concepts/areas';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { mock404Error } from '~/__mocks__/mockK8sStatus';

const handlers = (isEmpty: boolean): RestHandler<MockedRequest<DefaultBodyType>>[] => [
  rest.get(
    '/api/k8s/apis/image.openshift.io/v1/namespaces/opendatahub/imagestreams',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockK8sResourceList([
            mockImageStreamK8sResource({
              name: 'test-image',
              displayName: 'Test image',
              opts: {
                spec: {
                  tags: [
                    {
                      name: 'latest',
                    },
                  ],
                },
                status: {
                  tags: [
                    {
                      tag: 'latest',
                    },
                  ],
                },
              },
            }),
          ]),
        ),
      ),
  ),
  rest.get('/api/status', (req, res, ctx) => res(ctx.json(mockStatus()))),
  rest.get('/api/k8s/api/v1/namespaces/test-project/pods', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockPodK8sResource({})]))),
  ),
  rest.get(
    '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
    (req, res, ctx) => res(ctx.json(mockRouteK8sResource({}))),
  ),
  rest.get(
    '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-size',
    (req, res, ctx) => res(ctx.json(mockRouteK8sResource({ notebookName: 'test-size' }))),
  ),
  rest.get('/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks', (req, res, ctx) =>
    res(
      ctx.json(
        mockK8sResourceList(
          isEmpty
            ? []
            : [
                mockNotebookK8sResource({
                  opts: {
                    spec: {
                      template: {
                        spec: {
                          containers: [
                            {
                              name: 'test-notebook',
                              image: 'test-image:latest',
                            },
                          ],
                        },
                      },
                    },
                    metadata: {
                      name: 'test-notebook',
                      annotations: {
                        'opendatahub.io/image-display-name': 'Test image',
                      },
                    },
                  },
                }),
              ],
        ),
      ),
    ),
  ),
  rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: true })]))),
  ),
  rest.get('/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockPVCK8sResource({})]))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockK8sResourceList(
            isEmpty ? [] : [mockInferenceServiceK8sResource({ name: 'test-inference' })],
          ),
        ),
      ),
  ),
  rest.get('/api/k8s/api/v1/namespaces/test-project/secrets', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockDataConnection({}).data]))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockK8sResourceList(
            isEmpty
              ? []
              : [
                  mockServingRuntimeK8sResourceLegacy({}),
                  mockServingRuntimeK8sResource({
                    name: 'test-model',
                    namespace: 'test-project',
                    auth: true,
                    route: true,
                  }),
                ],
          ),
        ),
      ),
  ),
  rest.get(
    '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-inference',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockRouteK8sResourceModelServing({
            inferenceServiceName: 'test-inference',
            namespace: 'test-project',
          }),
        ),
      ),
  ),
  rest.get(
    '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
    (req, res, ctx) => res(ctx.json(mockServingRuntimeK8sResource({}))),
  ),
  rest.get(
    '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates',
    (req, res, ctx) =>
      res(ctx.json(mockK8sResourceList([mockServingRuntimeTemplateK8sResource({})]))),
  ),
  rest.get(
    '/api/k8s/apis/opendatahub.io/v1alpha/namespaces/opendatahub/odhdashboardconfigs/odh-dashboard-config',
    (req, res, ctx) => res(ctx.json(mockDashboardConfig({}))),
  ),
  rest.get(
    '/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/pipelines-definition',
    (req, res, ctx) => res(ctx.status(404), ctx.json(mock404Error({}))),
  ),
  rest.get(
    '/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/pipelines-definition',
    (req, res, ctx) => res(ctx.status(404), ctx.json(mock404Error({}))),
  ),
];

export default {
  component: ProjectDetails,
  parameters: {
    reactRouter: {
      location: {
        pathParams: { namespace: 'test-project' },
      },
      routing: [
        {
          path: '/projects/:namespace/*',
        },
      ],
    },
    msw: {
      handlers: handlers(false),
    },
  },
} as Meta<typeof ProjectDetails>;

const Template: StoryFn<typeof ProjectDetails> = (args) => {
  useDetectUser();
  return (
    <AreaContext.Provider
      value={{
        dscStatus: mockDscStatus({
          installedComponents: {
            [StackComponent.WORKBENCHES]: true,
            [StackComponent.K_SERVE]: true,
            [StackComponent.MODEL_MESH]: true,
          },
        }),
      }}
    >
      <ProjectsRoutes>
        <Route path="/" element={<ProjectDetailsContextProvider />}>
          <Route index element={<ProjectDetails {...args} />} />
        </Route>
      </ProjectsRoutes>
    </AreaContext.Provider>
  );
};

export const Default: StoryObj = {
  render: Template,
};

export const EmptyDetailsPage: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: handlers(true),
    },
  },
};

export const DisabledImage: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: [
        rest.get(
          '/api/k8s/apis/image.openshift.io/v1/namespaces/opendatahub/imagestreams',
          (req, res, ctx) =>
            res(
              ctx.json(
                mockK8sResourceList([
                  mockImageStreamK8sResource({
                    name: 'test-image',
                    displayName: 'Test image',
                    opts: {
                      metadata: {
                        labels: {
                          'opendatahub.io/notebook-image': 'false',
                        },
                      },
                      spec: {
                        tags: [
                          {
                            name: 'latest',
                          },
                        ],
                      },
                      status: {
                        tags: [
                          {
                            tag: 'latest',
                          },
                        ],
                      },
                    },
                  }),
                ]),
              ),
            ),
        ),
        ...handlers(false),
      ],
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Notebook', undefined, { timeout: 5000 });
  },
};

export const DeletedImage: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: [
        rest.get(
          '/api/k8s/apis/image.openshift.io/v1/namespaces/opendatahub/imagestreams',
          (req, res, ctx) =>
            res(
              ctx.json(
                mockK8sResourceList([
                  mockImageStreamK8sResource({
                    name: 'test-image',
                    displayName: 'Test image',
                  }),
                ]),
              ),
            ),
        ),
        ...handlers(false),
      ],
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Notebook', undefined, { timeout: 5000 });
  },
};

export const UnknownImage: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: [
        rest.get(
          '/api/k8s/apis/image.openshift.io/v1/namespaces/opendatahub/imagestreams',
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([]))),
        ),
        rest.get(
          '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks',
          (req, res, ctx) =>
            res(
              ctx.json(
                mockK8sResourceList([
                  mockNotebookK8sResource({
                    opts: {
                      spec: {
                        template: {
                          spec: {
                            containers: [
                              {
                                name: 'test-notebook',
                                image: 'test-image:latest',
                              },
                            ],
                          },
                        },
                      },
                      metadata: {
                        name: 'test-notebook',
                        annotations: {
                          'opendatahub.io/image-display-name': '',
                        },
                      },
                    },
                  }),
                ]),
              ),
            ),
        ),
        ...handlers(false),
      ],
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Notebook', undefined, { timeout: 5000 });
  },
};

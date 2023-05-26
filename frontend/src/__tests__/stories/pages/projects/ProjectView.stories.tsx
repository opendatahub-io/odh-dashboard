import { Meta } from '@storybook/react';
import { rest } from 'msw';
import { within, userEvent } from '@storybook/testing-library';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import ProjectView from '~/pages/projects/screens/projects/ProjectView';

export default {
  component: ProjectView,
  parameters: {
    msw: {
      handlers: [
        rest.get(
          '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
          (req, res, ctx) => res(ctx.json(mockRouteK8sResource({}))),
        ),
        rest.get('/api/k8s/api/v1/namespaces/test-project/pods', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockPodK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks',
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([mockNotebookK8sResource({})]))),
        ),
        rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
        ),
      ],
    },
  },
} as Meta<typeof ProjectView>;

export const EditProject = {
  parameters: {
    a11y: {
      // need to select modal as root
      element: '.pf-c-backdrop',
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Project', undefined, { timeout: 5000 });

    // user flow for editing a project
    await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
    await userEvent.click(canvas.getByText('Edit project', { selector: 'button' }));
  },
};

export const DeleteProject = {
  parameters: {
    a11y: {
      element: '.pf-c-backdrop',
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Project', undefined, { timeout: 5000 });

    // user flow for deleting a project
    await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
    await userEvent.click(canvas.getByText('Delete project', { selector: 'button' }));
  },
};

export const CreateProject = {
  parameters: {
    a11y: {
      element: '.pf-c-backdrop',
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Project', undefined, { timeout: 5000 });

    // user flow for deleting a project
    await userEvent.click(canvas.getByText('Create data science project', { selector: 'button' }));
  },
};

import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';
import { rest } from 'msw';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import ProjectView from './ProjectView';

export default {
  title: 'ProjectView',
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
} as ComponentMeta<typeof ProjectView>;

const Template: ComponentStory<typeof ProjectView> = (args) => (
  <div data-testid="story-loaded">
    <ProjectView {...args} />
  </div>
);

export const Default = Template.bind({});
Default.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Test Project', undefined, { timeout: 5000 });

  // test that values from api are be displayed correctly
  expect(await canvas.findByText('Test Project', { selector: 'a' })).toBeInTheDocument();
  expect(await canvas.findByText('test-user')).toBeInTheDocument();
};

export const EditProject = Template.bind({});
EditProject.parameters = {
  a11y: {
    // need to select modal as root
    element: '.pf-c-backdrop',
  },
};
EditProject.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Test Project', undefined, { timeout: 5000 });

  // user flow for editing a project
  await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
  await userEvent.click(canvas.getByText('Edit project', { selector: 'button' }));

  // get modal
  const body = within(canvasElement.ownerDocument.body);
  const nameInput = body.getByRole('textbox', { name: /Name/ });
  const updateButton = body.getByText('Update', { selector: 'button' });

  // test that you can not submit on empty
  await userEvent.clear(nameInput);
  expect(updateButton).toBeDisabled();

  // test that you can update the name to a different name
  await userEvent.type(nameInput, 'Updated Project', { delay: 50 });
  expect(updateButton).not.toBeDisabled();
};

export const DeleteProject = Template.bind({});
DeleteProject.parameters = {
  a11y: {
    element: '.pf-c-backdrop',
  },
};
DeleteProject.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Test Project', undefined, { timeout: 5000 });

  // user flow for deleting a project
  await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
  await userEvent.click(canvas.getByText('Delete project', { selector: 'button' }));

  // get modal
  const body = within(canvasElement.ownerDocument.body);
  const retypeNameInput = body.getByRole('textbox');
  const deleteButton = body.getByText('Delete project', { selector: 'button' });

  // test that empty input disables form
  expect(deleteButton).toBeDisabled();

  // test that you can not submit on wrong input
  await userEvent.type(retypeNameInput, 'not project', { delay: 50 });
  expect(deleteButton).toBeDisabled();
  await userEvent.clear(retypeNameInput);

  // test that you can delete on correct input
  await userEvent.type(retypeNameInput, 'Test Project', { delay: 50 });
  expect(deleteButton).not.toBeDisabled();
};

export const CreateProject = Template.bind({});
CreateProject.parameters = {
  a11y: {
    element: '.pf-c-backdrop',
  },
};
CreateProject.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Test Project', undefined, { timeout: 5000 });

  // user flow for deleting a project
  await userEvent.click(canvas.getByText('Create data science project', { selector: 'button' }));

  // get modal
  const body = within(canvasElement.ownerDocument.body);
  body.getByLabelText('Name');
  const resourceNameInput = body.getByRole('textbox', { name: /Resource name/ });
  const nameInput = body.getByRole('textbox', { name: /Name/ });
  const createButton = body.getByText('Create', { selector: 'button' });

  // test that empty input disables form
  expect(createButton).toBeDisabled();

  // test that you can submit on only giving name
  await userEvent.type(nameInput, 'new project', { delay: 50 });
  expect(createButton).not.toBeDisabled();

  // test no resource name
  await userEvent.clear(resourceNameInput);
  expect(createButton).toBeDisabled();

  // test resource name can not invalid you can edit the resource name
  await userEvent.type(resourceNameInput, 'resource name', { delay: 50 });
  expect(createButton).toBeDisabled();
  await userEvent.clear(resourceNameInput);

  // test you can edit the resource name
  await userEvent.type(resourceNameInput, 'resource-name', { delay: 50 });
  expect(createButton).not.toBeDisabled();
};

import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { Drawer } from '@patternfly/react-core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { PipelineTask } from '~/concepts/pipelines/topology';
import { Artifact } from '~/third_party/mlmd';

const artifactTask: PipelineTask = {
  type: 'artifact',
  name: 'metrics',
  metadata: new Artifact(),
  inputs: { artifacts: [{ label: 'metrics', type: 'system.Metrics (0.0.1)' }] },
};

const task: PipelineTask = {
  type: 'task',
  name: 'digit-classification',
  steps: [],
  outputs: { artifacts: [{ label: 'metrics', type: 'system.Metrics (0.0.1)' }] },
  status: {
    startTime: '2024-05-13T11:45:21.508Z',
    completeTime: '2024-05-13T11:45:22.317Z',
    taskId: 'task.digit-classification',
    podName: '',
  },
  volumeMounts: [],
};

describe('PipelineRunDrawerRightContent', () => {
  it('renders artifact drawer tabs when the task prop is of type "artifact"', () => {
    render(
      <BrowserRouter>
        <Drawer isExpanded>
          <PipelineRunDrawerRightContent task={artifactTask} executions={[]} onClose={jest.fn()} />
        </Drawer>
      </BrowserRouter>,
    );

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Artifact details' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Visualization' })).toBeVisible();
  });

  it('renders task drawer tabs when the task prop is of type "groupTask"', () => {
    render(
      <BrowserRouter>
        <Drawer isExpanded>
          <PipelineRunDrawerRightContent
            task={{ ...task, type: 'groupTask' }}
            executions={[]}
            onClose={jest.fn()}
          />
        </Drawer>
      </BrowserRouter>,
    );

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Input/Output' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Task details' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Volumes' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeVisible();
  });

  it('renders task drawer tabs when the task prop is of type "task"', () => {
    render(
      <BrowserRouter>
        <Drawer isExpanded>
          <PipelineRunDrawerRightContent task={task} executions={[]} onClose={jest.fn()} />
        </Drawer>
      </BrowserRouter>,
    );

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Input/Output' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Task details' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Volumes' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeVisible();
  });
});

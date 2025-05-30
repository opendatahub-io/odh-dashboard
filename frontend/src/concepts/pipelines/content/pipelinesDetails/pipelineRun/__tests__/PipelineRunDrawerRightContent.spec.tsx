import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Drawer } from '@patternfly/react-core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react';
import PipelineRunDrawerRightContent from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { PipelineTask } from '#~/concepts/pipelines/topology';
import { Artifact } from '#~/third_party/mlmd';

const artifactTask: PipelineTask = {
  type: 'artifact',
  name: 'metrics',
  metadata: new Artifact().setType('system.Metrics'),
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

// Mock the useDispatch hook
jest.mock('#~/redux/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('#~/concepts/areas/useIsAreaAvailable', () => () => ({
  status: true,
  featureFlags: {},
  reliantAreas: {},
  requiredComponents: {},
  requiredCapabilities: {},
  customCondition: jest.fn(),
}));

jest.mock('#~/concepts/pipelines/context/PipelinesContext', () => ({
  usePipelinesAPI: jest.fn(() => ({
    pipelinesServer: {
      initializing: false,
      installed: true,
      compatible: true,
      timedOut: false,
      name: 'dspa',
    },
    namespace: 'Test namespace',
    project: {
      metadata: {
        name: 'Test namespace',
      },
      kind: 'Project',
    },
    apiAvailable: true,
    api: {
      getArtifact: jest.fn(() =>
        // eslint-disable-next-line camelcase
        Promise.resolve({ download_url: 'https://example.com/download-url' }),
      ),
    },
  })),
}));

describe('PipelineRunDrawerRightContent', () => {
  it('renders artifact drawer tabs when the task prop is of type "artifact"', async () => {
    await act(async () =>
      render(
        <BrowserRouter>
          <Drawer isExpanded>
            <PipelineRunDrawerRightContent
              task={artifactTask}
              executions={[]}
              onClose={jest.fn()}
            />
          </Drawer>
        </BrowserRouter>,
      ),
    );

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Artifact details' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Visualization' })).toBeVisible();
  });

  it('renders task drawer tabs when the task prop is of type "groupTask"', async () => {
    await act(async () =>
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
      ),
    );

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Input/Output' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Task details' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Volumes' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeVisible();
  });

  it('renders task drawer tabs when the task prop is of type "task"', async () => {
    await act(async () =>
      render(
        <BrowserRouter>
          <Drawer isExpanded>
            <PipelineRunDrawerRightContent task={task} executions={[]} onClose={jest.fn()} />
          </Drawer>
        </BrowserRouter>,
      ),
    );

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Input/Output' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Task details' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Volumes' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeVisible();
  });
});

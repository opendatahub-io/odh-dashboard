import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { Drawer } from '@patternfly/react-core';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react';
import { PipelineTask } from '~/concepts/pipelines/topology';
import { Artifact, Value } from '~/third_party/mlmd';
import { ArtifactNodeDrawerContent } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/ArtifactNodeDrawerContent';

const task: PipelineTask = {
  type: 'artifact',
  name: 'metrics',
  metadata: createArtifact('system.Metrics'),
  inputs: { artifacts: [{ label: 'metrics', type: 'system.Metrics (0.0.1)' }] },
};

jest.mock('~/concepts/pipelines/content/compareRuns/metricsSection/confusionMatrix/utils', () => ({
  isConfusionMatrix: jest.fn(() => true),
}));

jest.mock('~/concepts/pipelines/content/compareRuns/metricsSection/roc/utils', () => ({
  buildRocCurveConfig: jest.fn(() => ({})),
  isConfidenceMetric: jest.fn(() => true),
}));

// Mock the useDispatch hook
jest.mock('~/redux/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('~/concepts/pipelines/content/artifacts/charts/confusionMatrix/utils', () => ({
  buildConfusionMatrixConfig: jest.fn(() => ({
    labels: ['Some label'],
    data: [[0]],
  })),
}));

jest.mock('~/concepts/areas/useIsAreaAvailable', () => () => ({
  status: true,
  featureFlags: {},
  reliantAreas: {},
  requiredComponents: {},
  requiredCapabilities: {},
  customCondition: jest.fn(),
}));

jest.mock('~/concepts/pipelines/context/PipelinesContext', () => ({
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

describe('ArtifactNodeDrawerContent', () => {
  it('renders artifact drawer content', async () => {
    await act(async () =>
      render(
        <BrowserRouter>
          <Drawer isExpanded>
            <ArtifactNodeDrawerContent
              task={task}
              upstreamTaskName="some-upstream-task"
              onClose={jest.fn()}
            />
          </Drawer>
        </BrowserRouter>,
      ),
    );

    expect(screen.getByRole('tab', { name: 'Artifact details' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const artifactDetailsList = screen.getByTestId('artifact-details-description-list');
    expect(within(artifactDetailsList).getByText('some-upstream-task')).toBeVisible();
    expect(within(artifactDetailsList).getByText('metrics')).toBeVisible();
    expect(within(artifactDetailsList).getByText('system.Metrics')).toBeVisible();
    expect(within(artifactDetailsList).getByText('1 Jan 2023')).toBeVisible();

    const artifactUriList = screen.getByTestId('artifact-uri-description-list');
    expect(within(artifactUriList).getByText('-')).toBeVisible();
  });

  it('renders "Scalar metrics" visualization drawer content', async () => {
    const user = userEvent.setup();
    await act(async () =>
      render(
        <BrowserRouter>
          <Drawer isExpanded>
            <ArtifactNodeDrawerContent
              task={task}
              upstreamTaskName="some-upstream-task"
              onClose={jest.fn()}
            />
          </Drawer>
        </BrowserRouter>,
      ),
    );

    await user.click(screen.getByRole('tab', { name: 'Visualization' }));
    expect(screen.getByRole('heading', { name: 'Scalar metrics' })).toBeVisible();
  });

  it('renders "ROC curve" visualization drawer content', async () => {
    const confidenceMetricsStruct = Struct.fromJavaScript({
      list: [
        {
          confidenceThreshold: 0,
          falsePositiveRate: 0,
          recall: 0,
        },
      ],
    });

    const user = userEvent.setup();
    const confidenceMetricsValue = new Value();
    confidenceMetricsValue.setStructValue(confidenceMetricsStruct);

    await act(async () =>
      render(
        <BrowserRouter>
          <Drawer isExpanded>
            <ArtifactNodeDrawerContent
              task={{
                ...task,
                metadata: createArtifact('system.ClassificationMetrics', {
                  key: 'confidenceMetrics',
                  value: confidenceMetricsValue,
                }),
              }}
              upstreamTaskName="some-upstream-task"
              onClose={jest.fn()}
            />
          </Drawer>
        </BrowserRouter>,
      ),
    );

    await user.click(screen.getByRole('tab', { name: 'Visualization' }));
    expect(screen.getByRole('heading', { name: 'ROC curve' })).toBeVisible();
  });

  it('renders "Confusion matrix metrics" visualization drawer content', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Drawer isExpanded>
          <ArtifactNodeDrawerContent
            task={{
              ...task,
              metadata: createArtifact('system.ClassificationMetrics', {
                key: 'confusionMatrix',
                value: new Value(),
              }),
            }}
            upstreamTaskName="some-upstream-task"
            onClose={jest.fn()}
          />
        </Drawer>
      </BrowserRouter>,
    );

    await user.click(screen.getByRole('tab', { name: 'Visualization' }));
    expect(screen.getByRole('heading', { name: 'Confusion matrix metrics' })).toBeVisible();
  });

  it('should not render "Dataset" visualization drawer tab', async () => {
    render(
      <BrowserRouter>
        <Drawer isExpanded>
          <ArtifactNodeDrawerContent
            task={{
              ...task,
              metadata: createArtifact('system.Dataset', {
                key: 'dataset',
                value: new Value(),
              }),
            }}
            upstreamTaskName="some-upstream-task"
            onClose={jest.fn()}
          />
        </Drawer>
      </BrowserRouter>,
    );

    expect(screen.queryByRole('tab', { name: 'Visualization' })).toBeNull();
  });

  it('should not render "Model" visualization drawer tab', async () => {
    render(
      <BrowserRouter>
        <Drawer isExpanded>
          <ArtifactNodeDrawerContent
            task={{
              ...task,
              metadata: createArtifact('system.Model', {
                key: 'model',
                value: new Value(),
              }),
            }}
            upstreamTaskName="some-upstream-task"
            onClose={jest.fn()}
          />
        </Drawer>
      </BrowserRouter>,
    );

    expect(screen.queryByRole('tab', { name: 'Visualization' })).toBeNull();
  });
});

function createArtifact(type: string, customProperty?: { key: string; value: Value }) {
  const artifact = new Artifact();

  artifact.setUri('some.uri');
  artifact.setType(type);
  artifact.setName('metrics');
  artifact.setCreateTimeSinceEpoch(1672585200000);

  if (customProperty) {
    artifact.getCustomPropertiesMap().set(customProperty.key, customProperty.value);
  }

  return artifact;
}

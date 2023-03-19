import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Bullseye,
  Spinner,
  PageSection,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  EmptyState,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { PipelineNodeModel } from '@patternfly/react-topology';
import { ValueOf } from '~/typeHelpers';
import PipelineTopology from '~/concepts/pipelines/topology/PipelineTopology';
import { createNode, createNodeId } from '~/concepts/pipelines/topology/utils';
import { PipelineContextProvider, usePipelinesAPI, CreatePipelineServerButton } from './context';

const options: { text: string; data: PipelineNodeModel[] }[] = [
  {
    text: 'Linear',
    data: (() => {
      const firstId = createNodeId('first');
      const secondId = createNodeId('second');
      const thirdId = createNodeId('third');

      return [
        createNode({ id: firstId, label: 'fetch' }),
        createNode({ id: secondId, label: 'build', runAfter: [firstId] }),
        createNode({ id: thirdId, label: 'deploy', runAfter: [secondId] }),
      ];
    })(),
  },
  {
    text: 'Parallel',
    data: (() => {
      const firstId = createNodeId('first');
      const secondId = createNodeId('second');
      const thirdId = createNodeId('third');
      const forthId = createNodeId('forth');
      const fifthId = createNodeId('fifth');

      return [
        createNode({ id: firstId, label: 'fetch' }),
        createNode({ id: secondId, label: 'build', runAfter: [firstId] }),
        createNode({ id: thirdId, label: 'test', runAfter: [firstId] }),
        createNode({ id: forthId, label: 'deploy-dev', runAfter: [secondId, thirdId] }),
        createNode({ id: fifthId, label: 'deploy-qe', runAfter: [secondId, thirdId] }),
      ];
    })(),
  },
  {
    text: 'Complex',
    data: (() => {
      const firstId = createNodeId();
      const secondId = createNodeId();
      const thirdId = createNodeId();
      const forthId = createNodeId();
      const fifthId = createNodeId();
      const sixthId = createNodeId();
      const seventhId = createNodeId();

      return [
        createNode({ id: firstId, label: 'one' }),
        createNode({ id: secondId, label: 'two', runAfter: [firstId] }),
        createNode({ id: thirdId, label: 'three', runAfter: [firstId] }),
        createNode({ id: forthId, label: 'four', runAfter: [thirdId, secondId] }),
        createNode({ id: fifthId, label: 'five', runAfter: [forthId, firstId] }),
        createNode({ id: sixthId, label: 'six', runAfter: [firstId] }),
        createNode({ id: seventhId, label: 'seven', runAfter: [thirdId] }),
      ];
    })(),
  },
];

const TestTopology = () => {
  const [selection, setSelection] = React.useState(options[0]);
  const { text: selectionName, data: selectionData } = selection;

  return (
    <Stack hasGutter>
      <StackItem>
        <ToggleGroup aria-label="Default with single selectable">
          {options.map((option) => (
            <ToggleGroupItem
              key={option.text}
              text={option.text}
              buttonId={option.text}
              isSelected={selectionName === option.text}
              onChange={() => setSelection(option)}
            />
          ))}
        </ToggleGroup>
      </StackItem>
      <StackItem isFilled>
        <PipelineTopology nodes={selectionData} />
      </StackItem>
    </Stack>
  );
};

/** TEMP FILE TO TEST PIPELINE API */
const TestPipelines: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  if (pipelinesAPI.pipelinesServer.initializing) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!pipelinesAPI.pipelinesServer.installed) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <div>
            <Title size="lg" headingLevel="h4">
              No Pipeline Server
            </Title>
            <br />
            <CreatePipelineServerButton variant="primary" />
          </div>
        </Bullseye>
      </PageSection>
    );
  }

  if (!pipelinesAPI.apiAvailable) {
    return (
      <EmptyState>
        <EmptyStateIcon variant="container" component={Spinner} />
        <Title size="lg" headingLevel="h4">
          API Loading...
        </Title>
      </EmptyState>
    );
  }

  const apis: { key: string; trigger: ValueOf<typeof pipelinesAPI.api> }[] = [
    { key: 'listPipelines', trigger: () => pipelinesAPI.api.listPipelines() },
  ];

  return (
    <>
      <PageSection variant="light">
        <h1>Pipeline API Methods (see console for responses)</h1>
        <ul>
          {apis.length === 0 && <li>No Apis</li>}
          {apis.map(({ key, trigger }) => (
            <li key={key}>
              <Button
                variant="link"
                // eslint-disable-next-line no-console
                onClick={() => trigger().then(console.log).catch(console.error)}
              >
                {key}
              </Button>
            </li>
          ))}
        </ul>
      </PageSection>
      <PageSection>
        <TestTopology />
      </PageSection>
    </>
  );
};

const TestPipelinesWrapper: React.FC = () => {
  const { namespace } = useParams();

  if (!namespace) {
    return (
      <Bullseye>
        <Alert title="Oh no!">Need route to have namespace</Alert>
      </Bullseye>
    );
  }

  return (
    <PipelineContextProvider namespace={namespace}>
      <TestPipelines />
    </PipelineContextProvider>
  );
};

export default TestPipelinesWrapper;

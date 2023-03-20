import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Bullseye, Spinner } from '@patternfly/react-core';
import { ValueOf } from '~/typeHelpers';
import { PipelineContextProvider, usePipelinesAPI, CreateCR } from './context';

/** TEMP FILE TO TEST PIPELINE API */
const TestPipelines: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  if (!pipelinesAPI.pipelinesEnabled) {
    return <CreateCR />;
  }
  if (!pipelinesAPI.apiAvailable) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const apis: { key: string; trigger: ValueOf<typeof pipelinesAPI.api> }[] = [
    { key: 'listPipelines', trigger: () => pipelinesAPI.api.listPipelines() },
  ];

  return (
    <div>
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
    </div>
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

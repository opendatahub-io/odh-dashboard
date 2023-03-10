import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Bullseye, Spinner } from '@patternfly/react-core';
import { PipelineContextProvider, usePipelinesAPI, CreateCR } from './context';

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

  const apis = Object.keys(pipelinesAPI.api);

  return (
    <div>
      <h1>Pipeline API Methods</h1>
      <ul>
        {apis.length === 0 && <li>No Apis</li>}
        {apis.map((key) => (
          <li key={key}>
            <Button variant="link" onClick={() => pipelinesAPI.api[key]().then(console.debug)}>
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

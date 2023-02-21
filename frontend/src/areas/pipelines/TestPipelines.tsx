import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Bullseye } from '@patternfly/react-core';
import { PipelineContextProvider, usePipelinesAPI } from './context';

const TestPipelines: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();

  if (!pipelinesAPI.isLoaded) {
    return <pipelinesAPI.loadingComponent />;
  }

  const apis = Object.keys(pipelinesAPI.api);

  return (
    <div>
      <h1>Pipeline Test</h1>
      <ul>
        {apis.length === 0 && <li>No Apis</li>}
        {apis.map((key) => (
          <li key={key}>{key}</li>
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

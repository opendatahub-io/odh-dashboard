import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import GlobalNoPipelines from '~/pages/pipelines/global/pipelines/GlobalNoPipelines';
import PipelinesTable from '~/concepts/pipelines/content/pipelinesTable/PipelinesTable';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';

const PipelinesView: React.FC = () => {
  const [pipelines, loaded, loadError] = usePipelines();

  if (loadError) {
    return (
      <EmptyStateErrorMessage title="Error displaying pipelines" bodyText={loadError.message} />
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (pipelines.length === 0) {
    return <GlobalNoPipelines />;
  }

  return <PipelinesTable pipelines={pipelines} />;
};

export default PipelinesView;

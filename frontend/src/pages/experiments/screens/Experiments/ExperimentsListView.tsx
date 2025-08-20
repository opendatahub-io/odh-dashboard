import * as React from 'react';
import { RegistryExperiment } from '#~/concepts/modelRegistry/types.ts';
import ExperimentsTable from './ExperimentsTable';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import EmptyModelRegistryState from '../../../../concepts/modelRegistry/content/EmptyModelRegistryState';

type ExperimentsListViewProps = {
  experiments: RegistryExperiment[];
};

const ExperimentsListView: React.FC<ExperimentsListViewProps> = ({ experiments }) => {
  if (experiments.length === 0) {
    return (
      <EmptyModelRegistryState
        testid="empty-experiments"
        title="No experiments"
        description="No experiments found"
      />
    );
  }

  return <ExperimentsTable experiments={experiments} />;
};

export default ExperimentsListView;

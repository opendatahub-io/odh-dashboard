import React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import PrecisionRecallChart from '~/app/components/run-results/AutomlModelDetailsModal/components/PrecisionRecallChart';

const PrecisionRecallTab: React.FC<TabContentProps> = ({ curves, isArtifactsLoading }) => {
  if (isArtifactsLoading) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label="Loading precision-recall curve data" />
      </Bullseye>
    );
  }

  if (!curves) {
    return (
      <p data-testid="precision-recall-no-data">
        Precision-recall curve data is not available for this model. This data may be generated if
        the training run is submitted again.
      </p>
    );
  }

  return <PrecisionRecallChart prData={curves} />;
};

export default PrecisionRecallTab;

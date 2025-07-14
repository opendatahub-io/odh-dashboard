import * as React from 'react';
import { Gallery } from '@patternfly/react-core';
import CollapsibleSection from '#~/concepts/design/CollapsibleSection';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import PipelinesCard from './PipelinesCard';
import NotebooksCard from './NotebooksCard';

const TrainModelsSection: React.FC = () => {
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  if (!workbenchEnabled && !pipelinesEnabled) {
    return null;
  }

  return (
    <CollapsibleSection title="Train models">
      <Gallery
        hasGutter
        minWidths={{ default: '100%', lg: pipelinesEnabled ? 'calc(50% - 1rem / 2)' : '100%' }}
        maxWidths={{ default: '100%', lg: pipelinesEnabled ? 'calc(50% - 1rem / 2)' : '100%' }}
      >
        {workbenchEnabled ? <NotebooksCard /> : null}
        {pipelinesEnabled ? <PipelinesCard /> : null}
      </Gallery>
    </CollapsibleSection>
  );
};

export default TrainModelsSection;

import * as React from 'react';
import { Alert, AlertActionCloseButton, ButtonVariant, Gallery } from '@patternfly/react-core';
import { CreatePipelineServerButton, usePipelinesAPI } from '~/concepts/pipelines/context';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import PipelinesCard from './PipelinesCard';
import NotebooksCard from './NotebooksCard';

const TrainModelsSection: React.FC = () => {
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const { pipelinesServer } = usePipelinesAPI();
  const [alertClosed, setAlertClosed] = React.useState<boolean>(false);

  const alert = React.useMemo(() => {
    if (!pipelinesEnabled || pipelinesServer.initializing || pipelinesServer.installed) {
      return null;
    }
    return (
      <Alert
        isInline
        variant="warning"
        title="Optional: Configure a pipeline server"
        actionClose={<AlertActionCloseButton onClose={() => setAlertClosed(true)} />}
        actionLinks={
          <CreatePipelineServerButton
            variant={ButtonVariant.link}
            isInline
            title="Configure pipeline server"
          />
        }
        style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}
      >
        <p>
          If you plan to use pipelines in your workbench, you must configure the pipeline server
          before you start the workbench.
        </p>
      </Alert>
    );
  }, [pipelinesEnabled, pipelinesServer.initializing, pipelinesServer.installed]);

  return (
    <CollapsibleSection title="Train models">
      {!pipelinesServer.installed && !alertClosed ? alert : null}
      <Gallery
        hasGutter
        minWidths={{ default: '100%', lg: pipelinesEnabled ? 'calc(50% - 1rem / 2)' : '100%' }}
        maxWidths={{ default: '100%', lg: pipelinesEnabled ? 'calc(50% - 1rem / 2)' : '100%' }}
      >
        <NotebooksCard />
        {pipelinesEnabled ? <PipelinesCard /> : null}
      </Gallery>
    </CollapsibleSection>
  );
};

export default TrainModelsSection;

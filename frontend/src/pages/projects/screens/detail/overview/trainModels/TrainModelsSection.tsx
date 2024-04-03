import * as React from 'react';
import { Alert, AlertActionCloseButton, ButtonVariant, Gallery } from '@patternfly/react-core';
import { CreatePipelineServerButton, usePipelinesAPI } from '~/concepts/pipelines/context';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import PipelinesCard from './PipelinesCard';
import NotebooksCard from './NotebooksCard';

const TrainModelsSection: React.FC = () => {
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const { pipelinesServer } = usePipelinesAPI();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });
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
          allowCreate ? (
            <CreatePipelineServerButton
              variant={ButtonVariant.link}
              isInline
              title="Configure pipeline server"
            />
          ) : undefined
        }
        style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}
      >
        <p>
          If you plan to use pipelines in your workbench, you must configure the pipeline server
          before you start the workbench.
        </p>
      </Alert>
    );
  }, [pipelinesEnabled, pipelinesServer.initializing, pipelinesServer.installed, allowCreate]);

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

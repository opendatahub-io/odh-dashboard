import * as React from 'react';
import { Bullseye, Button, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import PipelinesTable from '~/concepts/pipelines/content/tables/pipeline/PipelinesTable';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import IndentSection from '~/pages/projects/components/IndentSection';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { TABLE_CONTENT_LIMIT, LIMIT_MAX_ITEM_COUNT } from '~/concepts/pipelines/const';

type PipelinesListProps = {
  setIsPipelinesEmpty: (isEmpty: boolean) => void;
};

const PipelinesList: React.FC<PipelinesListProps> = ({ setIsPipelinesEmpty }) => {
  const { namespace } = usePipelinesAPI();
  const [pipelines, loaded, loadError, refresh] = usePipelines(LIMIT_MAX_ITEM_COUNT);
  const navigate = useNavigate();

  const isPipelinesEmpty = pipelines.length === 0;

  React.useEffect(() => {
    setIsPipelinesEmpty(isPipelinesEmpty);
  }, [isPipelinesEmpty, setIsPipelinesEmpty]);

  if (loadError) {
    return (
      <EmptyStateErrorMessage title="Error displaying pipelines" bodyText={loadError.message} />
    );
  }

  if (!loaded) {
    return (
      <Bullseye style={{ minHeight: 150 }}>
        <Spinner />
      </Bullseye>
    );
  }

  if (pipelines.length === 0) {
    return (
      <EmptyDetailsList title="No pipelines" description="To get started, import a pipeline." />
    );
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <PipelinesTable
          pipelines={pipelines}
          contentLimit={TABLE_CONTENT_LIMIT}
          pipelineDetailsPath={(namespace, id) => `/projects/${namespace}/pipeline/view/${id}`}
          refreshPipelines={refresh}
        />
      </StackItem>
      {pipelines.length > TABLE_CONTENT_LIMIT && (
        <StackItem>
          <IndentSection>
            <Button variant="link" onClick={() => navigate(`/pipelines/${namespace}`)}>
              View all pipelines
            </Button>
          </IndentSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default PipelinesList;

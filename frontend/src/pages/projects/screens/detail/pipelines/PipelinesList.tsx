import * as React from 'react';
import { Bullseye, Button, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { TableVariant } from '@patternfly/react-table';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import PipelinesTable from '~/concepts/pipelines/content/tables/pipeline/PipelinesTable';
import IndentSection from '~/pages/projects/components/IndentSection';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { TABLE_CONTENT_LIMIT } from '~/concepts/pipelines/const';
import usePipelinesTable from '~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';

type PipelinesListProps = {
  setIsPipelinesEmpty: (isEmpty: boolean) => void;
};

const PipelinesList: React.FC<PipelinesListProps> = ({ setIsPipelinesEmpty }) => {
  const { namespace } = usePipelinesAPI();
  const [
    [{ items: pipelines, totalSize }, loaded, loadError, refresh],
    { initialLoaded, ...tableProps },
  ] = usePipelinesTable(TABLE_CONTENT_LIMIT);
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

  if (!loaded && !initialLoaded) {
    return (
      <Bullseye style={{ minHeight: 150 }}>
        <Spinner />
      </Bullseye>
    );
  }

  if (loaded && pipelines.length === 0 && !tableProps.filter) {
    return <EmptyDetailsList title="No pipelines" />;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <PipelinesTable
          {...tableProps}
          totalSize={totalSize}
          loading={!loaded}
          pipelines={pipelines}
          aria-label="pipelines table"
          pipelineDetailsPath={(namespace, id) => `/projects/${namespace}/pipeline/view/${id}`}
          refreshPipelines={refresh}
          variant={TableVariant.compact}
        />
      </StackItem>
      {totalSize > TABLE_CONTENT_LIMIT && (
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

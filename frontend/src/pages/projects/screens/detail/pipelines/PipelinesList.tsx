import * as React from 'react';
import { Bullseye, Button, ButtonVariant, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { TableVariant } from '@patternfly/react-table';
import PipelinesTable from '~/concepts/pipelines/content/tables/pipeline/PipelinesTable';
import IndentSection from '~/pages/projects/components/IndentSection';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { TABLE_CONTENT_LIMIT } from '~/concepts/pipelines/const';
import usePipelinesTable from '~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';
import { pipelinesBaseRoute } from '~/routes/pipelines/global';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';

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
    return <NoPipelineServer variant={ButtonVariant.primary} />;
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
          refreshPipelines={refresh}
          variant={TableVariant.compact}
        />
      </StackItem>
      {totalSize > TABLE_CONTENT_LIMIT && (
        <StackItem>
          <IndentSection>
            <Button variant="link" onClick={() => navigate(pipelinesBaseRoute(namespace))}>
              View all pipelines
            </Button>
          </IndentSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default PipelinesList;

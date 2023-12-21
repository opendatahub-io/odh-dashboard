import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd, TableRowTitleDescription } from '~/components/table';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelinesTableRowTime from '~/concepts/pipelines/content/tables/PipelinesTableRowTime';

type PipelineVersionTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  pipelineVersionDetailsPath: (namespace: string, id: string) => string;
  version: PipelineVersionKF;
};

const PipelineVersionTableRow: React.FC<PipelineVersionTableRowProps> = ({
  isChecked,
  onToggleCheck,
  pipelineVersionDetailsPath,
  version,
}) => {
  const { namespace } = usePipelinesAPI();
  const createdDate = new Date(version.created_at);

  return (
    <Tr>
      <CheckboxTd id={version.id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td>
        <TableRowTitleDescription
          title={<Link to={pipelineVersionDetailsPath(namespace, version.id)}>{version.name}</Link>}
          description={version.description}
          descriptionAsMarkdown
        />
      </Td>
      <Td>
        <PipelinesTableRowTime date={createdDate} />
      </Td>
      <Td>
        {/* TODO: add navigation link, show be done with the pipeline runs page refactor */}
        <Button variant="link" isInline>
          View runs
        </Button>
      </Td>
    </Tr>
  );
};

export default PipelineVersionTableRow;

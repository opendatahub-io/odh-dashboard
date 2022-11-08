import * as React from 'react';
import { Skeleton } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ServingRuntimeKind } from '../../../../k8sTypes';
import EmptyTableCellForAlignment from '../../../projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '../types';
import ServingRuntimeTableExpandedSection from './ServingRuntimeTableExpandedSection';

type ServingRuntimeTableRowProps = {
  obj: ServingRuntimeKind;
};

const ServingRuntimeTableRow: React.FC<ServingRuntimeTableRowProps> = ({ obj }) => {
  const [expandedColumn, setExpandedColumn] = React.useState<ServingRuntimeTableTabs>();
  const isRowExpanded = !!expandedColumn;
  const {
    inferenceServices: { data: inferenceServices, loaded },
  } = React.useContext(ProjectDetailsContext);

  const onToggle = (_, __, colIndex: number) => {
    setExpandedColumn(expandedColumn === colIndex ? undefined : colIndex);
  };

  const compoundExpandParams = (col: ServingRuntimeTableTabs, isDisabled: boolean) =>
    !isDisabled
      ? {
          isExpanded: expandedColumn === col,
          onToggle,
          columnIndex: col,
        }
      : undefined;

  return (
    <Tbody isExpanded={isRowExpanded}>
      <Tr>
        <EmptyTableCellForAlignment />
        <Td
          dataLabel="Type"
          compoundExpand={compoundExpandParams(ServingRuntimeTableTabs.TYPE, false)}
        >
          {obj.spec.builtInAdapter.serverType}
        </Td>
        <Td
          dataLabel="Deployed models"
          compoundExpand={compoundExpandParams(
            ServingRuntimeTableTabs.DEPLOYED_MODELS,
            inferenceServices.length === 0,
          )}
        >
          {loaded ? inferenceServices.length : <Skeleton />}
        </Td>
        <Td
          dataLabel="Tokens"
          compoundExpand={compoundExpandParams(ServingRuntimeTableTabs.TOKENS, false)}
        >
          2
        </Td>
        <Td>View metrics</Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Edit model server',
                onClick: () => alert('Not implemented'),
              },
              {
                title: 'Delete model server',
                onClick: () => alert('Not implemented'),
              },
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isRowExpanded}>
        <ServingRuntimeTableExpandedSection activeColumn={expandedColumn} />
      </Tr>
    </Tbody>
  );
};

export default ServingRuntimeTableRow;

import { ExpandableRowContent, Td } from '@patternfly/react-table';
import * as React from 'react';
import { InferenceServiceKind } from '../../../../k8sTypes';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import EmptyTableCellForAlignment from '../../../projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import { columns } from '../global/data';
import InferenceServiceTable from '../global/InferenceServiceTable';
import { ServingRuntimeTableTabs } from '../types';
import ServingRuntimeTokens from './ServingRuntimeTokens';

type ServingRuntimeTableExpandedSectionProps = {
  activeColumn?: ServingRuntimeTableTabs;
};

const ServingRuntimeTableExpandedSection: React.FC<ServingRuntimeTableExpandedSectionProps> = ({
  activeColumn,
}) => {
  const {
    inferenceServices: { data: inferenceServices },
  } = React.useContext(ProjectDetailsContext);

  const inferenceServiceSort = useTableColumnSort<InferenceServiceKind>(columns, 0);

  if (activeColumn === ServingRuntimeTableTabs.TYPE) {
    return <>Not implemented 0</>;
  }
  if (activeColumn === ServingRuntimeTableTabs.DEPLOYED_MODELS) {
    return (
      <Td dataLabel="Deployed models" colSpan={6}>
        <ExpandableRowContent>
          <InferenceServiceTable
            inferenceServices={inferenceServices}
            getColumnSort={inferenceServiceSort.getColumnSort}
          />
        </ExpandableRowContent>
      </Td>
    );
  }
  if (activeColumn === ServingRuntimeTableTabs.TOKENS) {
    return (
      <>
        <EmptyTableCellForAlignment />
        <Td dataLabel="Tokens" colSpan={6}>
          <ExpandableRowContent>
            <ServingRuntimeTokens />
          </ExpandableRowContent>
        </Td>
      </>
    );
  }

  return null;
};

export default ServingRuntimeTableExpandedSection;

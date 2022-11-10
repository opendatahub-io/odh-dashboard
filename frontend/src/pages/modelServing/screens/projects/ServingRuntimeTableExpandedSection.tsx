import * as React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import { InferenceServiceKind, ServingRuntimeKind } from '../../../../k8sTypes';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import EmptyTableCellForAlignment from '../../../projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import { columns } from '../global/data';
import InferenceServiceTable from '../global/InferenceServiceTable';
import { ServingRuntimeTableTabs } from '../types';
import ServingRuntimeTokens from './ServingRuntimeTokens';
import ServingRuntimeDetails from './ServingRuntimeDetails';

type ServingRuntimeTableExpandedSectionProps = {
  activeColumn?: ServingRuntimeTableTabs;
  onClose: () => void;
  obj: ServingRuntimeKind;
};

const ServingRuntimeTableExpandedSection: React.FC<ServingRuntimeTableExpandedSectionProps> = ({
  activeColumn,
  onClose,
  obj,
}) => {
  const {
    inferenceServices: { data: inferenceServices },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);

  const inferenceServiceSort = useTableColumnSort<InferenceServiceKind>(columns, 0);

  if (activeColumn === ServingRuntimeTableTabs.TYPE) {
    return (
      <>
        <EmptyTableCellForAlignment />
        <Td dataLabel="Type expansion" colSpan={6}>
          <ExpandableRowContent>
            <ServingRuntimeDetails obj={obj} />
          </ExpandableRowContent>
        </Td>
      </>
    );
  }
  if (activeColumn === ServingRuntimeTableTabs.DEPLOYED_MODELS) {
    return (
      <Td dataLabel="Deployed models expansion" colSpan={6}>
        <ExpandableRowContent>
          <InferenceServiceTable
            inferenceServices={inferenceServices}
            getColumnSort={inferenceServiceSort.getColumnSort}
            refresh={() => {
              refreshAllProjectData();
              onClose();
            }}
          />
        </ExpandableRowContent>
      </Td>
    );
  }
  if (activeColumn === ServingRuntimeTableTabs.TOKENS) {
    return (
      <>
        <EmptyTableCellForAlignment />
        <Td dataLabel="Tokens expansion" colSpan={6}>
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

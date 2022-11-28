import * as React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import { InferenceServiceKind, SecretKind, ServingRuntimeKind } from '../../../../k8sTypes';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import EmptyTableCellForAlignment from '../../../projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import { inferenceServiceColumns, tokenColumns } from '../global/data';
import InferenceServiceTable from '../global/InferenceServiceTable';
import { ServingRuntimeTableTabs } from '../types';
import ServingRumtimeTokensTable from './ServingRuntimeTokensTable';
import ServingRuntimeDetails from './ServingRuntimeDetails';
import { isServingRuntimeTokenEnabled } from './utils';

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

  const inferenceServiceSort = useTableColumnSort<InferenceServiceKind>(inferenceServiceColumns, 0);
  const tokenSort = useTableColumnSort<SecretKind>(tokenColumns, 0);

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
            servingRuntimes={[obj]}
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
      <Td dataLabel="Tokens expansion" colSpan={6}>
        <ExpandableRowContent>
          <ServingRumtimeTokensTable
            getColumnSort={tokenSort.getColumnSort}
            isTokenEnabled={isServingRuntimeTokenEnabled(obj)}
          />
        </ExpandableRowContent>
      </Td>
    );
  }

  return null;
};

export default ServingRuntimeTableExpandedSection;

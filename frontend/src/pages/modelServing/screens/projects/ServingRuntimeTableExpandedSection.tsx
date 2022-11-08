import { ExpandableRowContent, Td } from '@patternfly/react-table';
import * as React from 'react';
import { InferenceServiceKind } from '../../../../k8sTypes';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import { columns } from '../global/data';
import InferenceServiceTable from '../global/InferenceServiceTable';
import { ServingRuntimeTableTabs } from '../types';

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
    return <>Not implemented 2</>;
  }

  return null;
};

export default ServingRuntimeTableExpandedSection;

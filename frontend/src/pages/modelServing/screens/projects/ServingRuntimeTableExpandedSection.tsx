import * as React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import { ServingRuntimeKind } from '~/k8sTypes';
import EmptyTableCellForAlignment from '~/pages/projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import InferenceServiceTable from '~/pages/modelServing/screens/global/InferenceServiceTable';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import ScrollViewOnMount from '~/components/ScrollViewOnMount';
import EmptyInferenceServicesCell from './EmptyInferenceServicesCell';
import { getInferenceServiceFromServingRuntime, isServingRuntimeTokenEnabled } from './utils';
import ServingRuntimeDetails from './ServingRuntimeDetails';
import ServingRuntimeTokensTable from './ServingRuntimeTokensTable';

type ServingRuntimeTableExpandedSectionProps = {
  activeColumn?: ServingRuntimeTableTabs;
  onClose: () => void;
  onDeployModel: () => void;
  obj: ServingRuntimeKind;
};

const ServingRuntimeTableExpandedSection: React.FC<ServingRuntimeTableExpandedSectionProps> = ({
  activeColumn,
  onClose,
  onDeployModel,
  obj,
}) => {
  const {
    inferenceServices: { data: inferenceServices },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);

  const modelInferenceServices = getInferenceServiceFromServingRuntime(inferenceServices, obj);

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
          {modelInferenceServices.length > 0 ? (
            <InferenceServiceTable
              inferenceServices={modelInferenceServices}
              servingRuntimes={[obj]}
              refresh={() => {
                refreshAllProjectData();
                onClose();
              }}
            />
          ) : (
            <EmptyInferenceServicesCell onDeployModel={onDeployModel} />
          )}
          <ScrollViewOnMount />
        </ExpandableRowContent>
      </Td>
    );
  }
  if (activeColumn === ServingRuntimeTableTabs.TOKENS) {
    return (
      <Td dataLabel="Tokens expansion" colSpan={6}>
        <ExpandableRowContent>
          <ServingRuntimeTokensTable obj={obj} isTokenEnabled={isServingRuntimeTokenEnabled(obj)} />
        </ExpandableRowContent>
      </Td>
    );
  }

  return null;
};

export default ServingRuntimeTableExpandedSection;

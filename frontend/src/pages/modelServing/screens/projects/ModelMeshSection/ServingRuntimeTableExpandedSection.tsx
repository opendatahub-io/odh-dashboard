import * as React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import { ServingRuntimeKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import InferenceServiceTable from '~/pages/modelServing/screens/global/InferenceServiceTable';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import ScrollViewOnMount from '~/components/ScrollViewOnMount';
import ServingRuntimeTokensTable from '~/pages/modelServing/screens/projects/ModelMeshSection/ServingRuntimeTokensTable';
import EmptyInferenceServicesCell from '~/pages/modelServing/screens/projects/ModelMeshSection/EmptyInferenceServicesCell';
import {
  getInferenceServiceFromServingRuntime,
  isServingRuntimeTokenEnabled,
} from '~/pages/modelServing/screens/projects/utils';
import ServingRuntimeDetails from './ServingRuntimeDetails';

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
    inferenceServices: { data: inferenceServices, refresh: refreshInferenceServices },
  } = React.useContext(ProjectDetailsContext);

  const modelInferenceServices = getInferenceServiceFromServingRuntime(inferenceServices, obj);

  if (activeColumn === ServingRuntimeTableTabs.TYPE) {
    return (
      <>
        <Td dataLabel="Type expansion" colSpan={7}>
          <ExpandableRowContent>
            <ServingRuntimeDetails obj={obj} />
          </ExpandableRowContent>
        </Td>
      </>
    );
  }
  if (activeColumn === ServingRuntimeTableTabs.DEPLOYED_MODELS) {
    return (
      <Td dataLabel="Deployed models expansion" colSpan={7}>
        <ExpandableRowContent>
          {modelInferenceServices.length > 0 ? (
            <InferenceServiceTable
              inferenceServices={modelInferenceServices}
              servingRuntimes={[obj]}
              refresh={() => {
                refreshInferenceServices();
                onClose();
              }}
            />
          ) : (
            <EmptyInferenceServicesCell onDeployModel={onDeployModel} />
          )}
          <ScrollViewOnMount shouldScroll />
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

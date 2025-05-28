import * as React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import { ServingRuntimeKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import InferenceServiceTable from '~/pages/modelServing/screens/global/InferenceServiceTable';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import ScrollViewOnMount from '~/components/ScrollViewOnMount';
import ServingRuntimeTokensTable from '~/pages/modelServing/screens/projects/ModelMeshSection/ServingRuntimeTokensTable';
import {
  getInferenceServiceFromServingRuntime,
  isServingRuntimeTokenEnabled,
} from '~/pages/modelServing/screens/projects/utils';
import ServingRuntimeDetails from './ServingRuntimeDetails';

type ServingRuntimeTableExpandedSectionProps = {
  activeColumn?: ServingRuntimeTableTabs;
  onClose: () => void;
  obj: ServingRuntimeKind;
  project: string;
};

const ServingRuntimeTableExpandedSection: React.FC<ServingRuntimeTableExpandedSectionProps> = ({
  activeColumn,
  onClose,
  obj,
  project,
}) => {
  const {
    inferenceServices: {
      data: { items: inferenceServices },
      refresh: refreshInferenceServices,
    },
  } = React.useContext(ProjectDetailsContext);

  const modelInferenceServices = getInferenceServiceFromServingRuntime(inferenceServices, obj);

  if (activeColumn === ServingRuntimeTableTabs.TYPE) {
    return (
      <>
        <Td dataLabel="Type expansion" colSpan={7}>
          <ExpandableRowContent>
            <ServingRuntimeDetails obj={obj} project={project} />
          </ExpandableRowContent>
        </Td>
      </>
    );
  }
  if (activeColumn === ServingRuntimeTableTabs.DEPLOYED_MODELS) {
    return (
      <Td dataLabel="Deployed models expansion" colSpan={7}>
        <ExpandableRowContent>
          <InferenceServiceTable
            inferenceServices={modelInferenceServices}
            servingRuntimes={[obj]}
            refresh={() => {
              refreshInferenceServices();
              onClose();
            }}
          />
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

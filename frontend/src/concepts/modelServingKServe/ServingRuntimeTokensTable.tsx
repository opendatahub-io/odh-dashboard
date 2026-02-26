import * as React from 'react';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { InferenceServiceKind, isInferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { TokensDescriptionItem } from '#~/concepts/modelServing/ModelRow/TokensDescriptionItem';
import { isNIMOperatorManaged } from '#~/pages/modelServing/screens/global/nimOperatorUtils';

type ServingRuntimeTokensTableProps = {
  obj: ServingRuntimeKind | InferenceServiceKind;
  isTokenEnabled: boolean;
};

const ServingRuntimeTokensTable: React.FC<ServingRuntimeTokensTableProps> = ({
  obj,
  isTokenEnabled,
}) => {
  const {
    serverSecrets: { loaded, error },
    filterTokens,
  } = React.useContext(ProjectDetailsContext);

  // For InferenceServices, determine the name to use for token filtering
  // - NIM Operator deployments: Use the InferenceService name itself (tokens are tied to the InferenceService)
  // - Legacy deployments: Use the ServingRuntime name (tokens are tied to the ServingRuntime)
  let name: string | undefined;
  if (isInferenceServiceKind(obj)) {
    if (isNIMOperatorManaged(obj)) {
      // NIM Operator: tokens are created with the InferenceService name
      name = obj.metadata.name;
    } else {
      // Legacy: tokens are created with the ServingRuntime name
      name = obj.spec.predictor.model?.runtime;
    }
  } else {
    // ServingRuntime
    name = obj.metadata.name;
  }

  const tokens = filterTokens(name);

  return (
    <TokensDescriptionItem
      tokens={tokens}
      isTokenEnabled={isTokenEnabled}
      loaded={loaded}
      error={error}
    />
  );
};

export default ServingRuntimeTokensTable;

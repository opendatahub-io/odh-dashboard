import * as React from 'react';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { InferenceServiceKind, isInferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { TokensDescriptionItem } from '#~/concepts/modelServing/ModelRow/TokensDescriptionItem';
import { isNIMOperatorManaged } from '#~/pages/modelServing/screens/projects/nim/nimOperatorUtils';

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

  let name: string | undefined;
  if (isInferenceServiceKind(obj)) {
    // NIM Operator deployments have no ServingRuntime, so use the InferenceService name
    if (isNIMOperatorManaged(obj)) {
      name = obj.metadata.name;
    } else {
      name = obj.spec.predictor.model?.runtime;
    }
  } else {
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

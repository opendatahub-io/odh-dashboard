import * as React from 'react';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { InferenceServiceKind, isInferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { TokensDescriptionItem } from '#~/concepts/modelServing/ModelRow/TokensDescriptionItem';

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

  const name = isInferenceServiceKind(obj) ? obj.spec.predictor.model?.runtime : obj.metadata.name;

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

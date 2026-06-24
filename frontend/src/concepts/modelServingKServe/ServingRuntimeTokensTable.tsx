import * as React from 'react';
import type { ServingRuntimeKind } from '@odh-dashboard/k8s-core';
import { TokensDescriptionItem } from '#~/concepts/modelServing/ModelRow/TokensDescriptionItem';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { InferenceServiceKind, isInferenceServiceKind } from '#~/k8sTypes';

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

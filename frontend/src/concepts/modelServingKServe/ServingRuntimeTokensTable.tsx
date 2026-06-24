import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { TokensDescriptionItem } from '@odh-dashboard/model-serving/components/tokens/TokensDescriptionItem';
import type { ServingRuntimeKind } from '@odh-dashboard/k8s-core';
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

import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { InferenceServiceKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';

type InferenceServiceModelProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceModel: React.FC<InferenceServiceModelProps> = ({ inferenceService }) => {
  const {
    servingRuntimes: { data: servingRuntimes, loaded, error },
  } = React.useContext(ModelServingContext);
  const servingRuntime = servingRuntimes.find(
    ({ metadata: { name } }) => name === inferenceService.spec.predictor.model.runtime,
  );

  if (!loaded) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <HelperText>
        <HelperTextItem variant="warning" hasIcon>
          Failed to get model server for this deployed model. {error.message}
        </HelperTextItem>
      </HelperText>
    );
  }

  return <>{servingRuntime ? getDisplayNameFromK8sResource(servingRuntime) : 'Unknown'}</>;
};

export default InferenceServiceModel;

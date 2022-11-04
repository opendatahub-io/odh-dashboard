import { ClipboardCopy, HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import * as React from 'react';
import { InferenceServiceKind } from '../../../../k8sTypes';
import useRouteForInferenceService from './useRouteForInferenceService';

type InferenceServiceEndpointProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceEndpoint: React.FC<InferenceServiceEndpointProps> = ({
  inferenceService,
}) => {
  const [routeLink, loaded, loadError] = useRouteForInferenceService(inferenceService);

  if (!loaded) {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="warning" hasIcon>
          Failed to get endpoint for this deployed model. {loadError.message}
        </HelperTextItem>
      </HelperText>
    );
  }

  return (
    <ClipboardCopy hoverTip="Copy" clickTip="Copied" variant="inline-compact">
      {routeLink}
    </ClipboardCopy>
  );
};

export default InferenceServiceEndpoint;

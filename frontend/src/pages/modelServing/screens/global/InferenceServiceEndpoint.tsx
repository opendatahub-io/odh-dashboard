import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  HelperText,
  HelperTextItem,
  Popover,
  Skeleton,
} from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import {
  isServingRuntimeRouteEnabled,
  isInferenceServiceRouteEnabled,
} from '~/pages/modelServing/screens/projects/utils';
import useRouteForInferenceService from './useRouteForInferenceService';
import InternalServicePopoverContent from './InternalServicePopoverContent';

type InferenceServiceEndpointProps = {
  inferenceService: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
  isKserve?: boolean;
};

const InferenceServiceEndpoint: React.FC<InferenceServiceEndpointProps> = ({
  inferenceService,
  servingRuntime,
  isKserve,
}) => {
  const isRouteEnabled = !isKserve
    ? servingRuntime !== undefined && isServingRuntimeRouteEnabled(servingRuntime)
    : isInferenceServiceRouteEnabled(inferenceService);

  const [routeLink, loaded, loadError] = useRouteForInferenceService(
    inferenceService,
    isRouteEnabled,
    isKserve,
  );

  if (!isRouteEnabled) {
    return (
      <Popover
        data-testid="internal-service-popover"
        headerContent="Internal Service can be accessed inside the cluster"
        aria-label="Internal Service Info"
        bodyContent={
          <InternalServicePopoverContent inferenceService={inferenceService} isKserve={isKserve} />
        }
      >
        <Button data-testid="internal-service-button" isInline variant="link">
          Internal Service
        </Button>
      </Popover>
    );
  }

  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">
          Failed to get endpoint for this deployed model. {loadError.message}
        </HelperTextItem>
      </HelperText>
    );
  }

  if (!loaded || !routeLink) {
    return <Skeleton />;
  }

  return (
    <ClipboardCopy hoverTip="Copy" clickTip="Copied" isReadOnly>
      {isKserve ? routeLink : `${routeLink}/infer`}
    </ClipboardCopy>
  );
};

export default InferenceServiceEndpoint;

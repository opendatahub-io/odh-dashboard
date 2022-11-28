import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  HelperText,
  HelperTextItem,
  Popover,
  Skeleton,
} from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '../../../../k8sTypes';
import useRouteForInferenceService from './useRouteForInferenceService';
import { isServingRuntimeRouteEnabled } from '../projects/utils';
import InternalServicePopoverContent from './InternalServicePopoverContent';

type InferenceServiceEndpointProps = {
  inferenceService: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
};

const InferenceServiceEndpoint: React.FC<InferenceServiceEndpointProps> = ({
  inferenceService,
  servingRuntime,
}) => {
  const isRouteEnabled =
    servingRuntime !== undefined && isServingRuntimeRouteEnabled(servingRuntime);

  const [routeLink, loaded, loadError] = useRouteForInferenceService(
    inferenceService,
    isRouteEnabled,
  );

  if (!isRouteEnabled) {
    return (
      <Popover
        removeFindDomNode
        headerContent="Internal Service can be accessed inside the cluster"
        aria-label="Internal Service Info"
        bodyContent={<InternalServicePopoverContent inferenceService={inferenceService} />}
      >
        <Button isInline variant="link">
          Internal Service
        </Button>
      </Popover>
    );
  }

  if (!routeLink || !loaded) {
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
    <ClipboardCopy hoverTip="Copy" clickTip="Copied" isReadOnly>
      {`${routeLink}/infer`}
    </ClipboardCopy>
  );
};

export default InferenceServiceEndpoint;

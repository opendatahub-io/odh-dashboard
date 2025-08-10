import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  HelperText,
  HelperTextItem,
  Popover,
  Skeleton,
} from '@patternfly/react-core';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import {
  isServingRuntimeRouteEnabled,
  isInferenceServiceRouteEnabled,
} from '#~/pages/modelServing/screens/projects/utils';
import { ToggleState } from '#~/components/StateActionToggle.tsx';
import useRouteForInferenceService from './useRouteForInferenceService';
import InternalServicePopoverContent from './InternalServicePopoverContent';

type InferenceServiceEndpointProps = {
  inferenceService: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
  isKserve?: boolean;
  modelState: ToggleState & { isFailed: boolean };
};

const InferenceServiceEndpoint: React.FC<InferenceServiceEndpointProps> = ({
  inferenceService,
  servingRuntime,
  isKserve,
  modelState,
}) => {
  const { isStopped, isRunning, isStarting, isStopping, isFailed } = modelState;

  const isRouteEnabled = !isKserve
    ? servingRuntime !== undefined && isServingRuntimeRouteEnabled(servingRuntime)
    : isInferenceServiceRouteEnabled(inferenceService);

  const [routeLink, loaded, loadError] = useRouteForInferenceService(
    inferenceService,
    isRouteEnabled,
    isKserve,
  );

  const endpointDetails = (
    <InferenceServiceEndpointContent
      inferenceService={inferenceService}
      isKserve={isKserve}
      isRouteEnabled={isRouteEnabled}
      routeLink={routeLink || undefined}
      loaded={loaded}
      loadError={loadError || undefined}
      modelState={modelState}
    />
  );

  if (isFailed || isStopped || isStopping) {
    return <>Not available</>;
  }

  if (isStarting || (isRouteEnabled && !loaded)) {
    return <>Pending</>;
  }

  if (isRunning) {
    return endpointDetails;
  }

  return endpointDetails;
};

const InferenceServiceEndpointContent: React.FC<{
  inferenceService: InferenceServiceKind;
  isKserve?: boolean;
  isRouteEnabled: boolean;
  routeLink?: string;
  loaded: boolean;
  loadError?: Error;
  modelState: ToggleState;
}> = ({ inferenceService, isKserve, isRouteEnabled, routeLink, loaded, loadError, modelState }) => {
  const { isStopped, isStopping } = modelState;

  if (!isRouteEnabled) {
    return (
      <Popover
        data-testid="internal-service-popover"
        headerContent="Inference endpoints"
        aria-label="Internal Service Info"
        hasAutoWidth
        bodyContent={
          <InternalServicePopoverContent inferenceService={inferenceService} isKserve={isKserve} />
        }
      >
        <Button data-testid="internal-service-button" isInline variant="link">
          Internal endpoint
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

  if ((!loaded || !routeLink) && !isStopping && !isStopped) {
    return <Skeleton />;
  }

  return (
    <Popover
      data-testid="external-service-popover"
      headerContent="Inference endpoints"
      aria-label="External Service Info"
      hasAutoWidth
      bodyContent={
        <InternalServicePopoverContent inferenceService={inferenceService} isKserve={isKserve} />
      }
      footerContent={
        <DescriptionList>
          <DescriptionListGroup>
            <Divider />
            <DescriptionListTerm>External</DescriptionListTerm>
            <DescriptionListDescription>
              Accessible from inside or outside the cluster.
            </DescriptionListDescription>
            <DescriptionListDescription>
              {isStopped || isStopping ? (
                <>Could not find any external service enabled</>
              ) : routeLink ? (
                <ClipboardCopy
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant={ClipboardCopyVariant.inlineCompact}
                >
                  {isKserve ? routeLink : `${routeLink}/infer`}
                </ClipboardCopy>
              ) : (
                <Skeleton />
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      }
    >
      <Button data-testid="internal-external-service-button" isInline variant="link">
        Internal and external endpoint
      </Button>
    </Popover>
  );
};

export default InferenceServiceEndpoint;

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
import { Link } from 'react-router-dom';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import {
  isServingRuntimeRouteEnabled,
  isInferenceServiceRouteEnabled,
} from '#~/pages/modelServing/screens/projects/utils';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import useRouteForInferenceService from './useRouteForInferenceService';
import InternalServicePopoverContent from './InternalServicePopoverContent';

type InferenceServiceEndpointProps = {
  inferenceService: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
  isKserve?: boolean;
  modelState?: InferenceServiceModelState;
  isStarting?: boolean;
  isGlobal?: boolean;
  renderName?: boolean;
  displayName?: string;
};

const InferenceServiceEndpoint: React.FC<InferenceServiceEndpointProps> = ({
  inferenceService,
  servingRuntime,
  isKserve,
  modelState,
  isStarting = false,
  isGlobal = false,
  renderName = false,
  displayName,
}) => {
  const isModelStopped =
    inferenceService.metadata.annotations?.['serving.kserve.io/stop'] === 'true';
  const isModelRunning = modelState === InferenceServiceModelState.LOADED && !isModelStopped;

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
    />
  );

  if (renderName) {
    const name = displayName || getDisplayNameFromK8sResource(inferenceService);

    if (isModelRunning || isModelStopped) {
      const metricsPath = isGlobal
        ? `/modelServing/${inferenceService.metadata.namespace}/metrics/${inferenceService.metadata.name}`
        : `/projects/${inferenceService.metadata.namespace}/metrics/model/${inferenceService.metadata.name}`;

      return (
        <Link data-testid={`metrics-link-${name}`} to={metricsPath}>
          {name}
        </Link>
      );
    }
    return <>{name}</>;
  }
  if (isModelStopped || modelState === InferenceServiceModelState.LOADED) {
    return endpointDetails;
  }
  if (modelState === InferenceServiceModelState.FAILED_TO_LOAD) {
    return <>-</>;
  }
  if (
    modelState === InferenceServiceModelState.LOADING ||
    modelState === InferenceServiceModelState.PENDING ||
    isStarting
  ) {
    return <>Pending...</>;
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
}> = ({ inferenceService, isKserve, isRouteEnabled, routeLink, loaded, loadError }) => {
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
          Internal endpoint details
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
            <DescriptionListTerm>
              External (can be accessed from inside or outside the cluster)
            </DescriptionListTerm>
            <DescriptionListDescription style={{ paddingLeft: 'var(--pf-t--global--spacer--md)' }}>
              <ClipboardCopy
                hoverTip="Copy"
                clickTip="Copied"
                variant={ClipboardCopyVariant.inlineCompact}
              >
                {isKserve ? routeLink : `${routeLink}/infer`}
              </ClipboardCopy>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      }
    >
      <Button data-testid="internal-external-service-button" isInline variant="link">
        Internal and external endpoint details
      </Button>
    </Popover>
  );
};

export default InferenceServiceEndpoint;

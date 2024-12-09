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

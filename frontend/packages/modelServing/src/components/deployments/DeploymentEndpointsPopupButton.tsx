import React from 'react';
import {
  Popover,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  ClipboardCopy,
  ClipboardCopyVariant,
  Divider,
  HelperText,
  HelperTextItem,
  Skeleton,
} from '@patternfly/react-core';
import { DeploymentEndpoint } from '../../../extension-points';

const EndpointListItem: React.FC<{ endpoint: DeploymentEndpoint }> = ({ endpoint }) => (
  <DescriptionListGroup key={endpoint.name}>
    {endpoint.name && <DescriptionListTerm>{endpoint.name}</DescriptionListTerm>}
    <DescriptionListDescription style={{ paddingLeft: 'var(--pf-t--global--spacer--md)' }}>
      {endpoint.error ? (
        <HelperText>
          <HelperTextItem variant="warning">{endpoint.error}</HelperTextItem>
        </HelperText>
      ) : (
        <ClipboardCopy
          hoverTip="Copy"
          clickTip="Copied"
          variant={ClipboardCopyVariant.inlineCompact}
        >
          {endpoint.url}
        </ClipboardCopy>
      )}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

type DeploymentEndpointsPopupButtonProps = {
  endpoints?: DeploymentEndpoint[];
  loading: boolean;
};

export const DeploymentEndpointsPopupButton: React.FC<DeploymentEndpointsPopupButtonProps> = ({
  endpoints,
  loading,
}) => {
  if (loading) {
    return <Skeleton />;
  }

  if (!endpoints || endpoints.length === 0) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">
          Failed to get endpoint for this deployed model.
        </HelperTextItem>
      </HelperText>
    );
  }

  const internalEndpoints = endpoints.filter((endpoint) => endpoint.type === 'internal');
  const externalEndpoints = endpoints.filter((endpoint) => endpoint.type === 'external');

  const hasExternalEndpoints = externalEndpoints.length > 0;

  return (
    <Popover
      data-testid={hasExternalEndpoints ? 'external-service-popover' : 'internal-service-popover'}
      headerContent="Inference endpoints"
      aria-label={hasExternalEndpoints ? 'External Service Info' : 'Internal Service Info'}
      hasAutoWidth
      bodyContent={
        <DescriptionList isCompact>
          {internalEndpoints.length === 0 ? (
            <DescriptionListTerm>No internal endpoints found</DescriptionListTerm>
          ) : (
            internalEndpoints.map((endpoint) => (
              <EndpointListItem key={endpoint.name} endpoint={endpoint} />
            ))
          )}

          {externalEndpoints.length > 0 && (
            <>
              <Divider />
              <DescriptionListTerm>
                External (can be accessed from inside or outside the cluster)
              </DescriptionListTerm>

              {externalEndpoints.map((endpoint) => (
                <EndpointListItem key={endpoint.name} endpoint={endpoint} />
              ))}
            </>
          )}
        </DescriptionList>
      }
    >
      <Button
        data-testid={
          hasExternalEndpoints ? 'internal-external-service-button' : 'internal-service-button'
        }
        isInline
        variant="link"
      >
        {hasExternalEndpoints
          ? 'Internal and external endpoint details'
          : 'Internal endpoint details'}
      </Button>
    </Popover>
  );
};

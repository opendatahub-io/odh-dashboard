import * as React from 'react';
import {
  Alert,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Spinner,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { renderRequest } from './requestDisplay';
import { normalizeResourceClaimTemplateRequests } from './requestNormalizer';
import type { ResourceClaimTemplateLookupState } from './useResourceClaimTemplateLookup';

type DeviceRequestsSectionProps = {
  templateName: string;
  namespace?: string;
  lookup: ResourceClaimTemplateLookupState;
};

/** Non-row content for every state except `loaded`, which renders rows in the list. */
const renderLookupStatus = (
  lookup: ResourceClaimTemplateLookupState,
  namespace: string | undefined,
): React.ReactNode => {
  const projectLabel = namespace ? `the ${namespace} project` : 'this project';
  switch (lookup.status) {
    case 'idle':
    case 'loaded':
      return null;
    case 'loading':
      return (
        <Spinner
          size="md"
          aria-label="Loading device requests"
          data-testid="device-requests-loading"
        />
      );
    case 'noNamespace':
      return (
        <Alert
          variant="info"
          isInline
          title="Device request details unavailable"
          data-testid="device-requests-no-namespace"
        >
          The workload project is not known, so this template cannot be loaded.
        </Alert>
      );
    case 'missing':
      return (
        <Alert
          variant="warning"
          isInline
          title="Template not found"
          data-testid="device-requests-missing"
        >
          This template is not in {projectLabel}. Contact your administrator.
        </Alert>
      );
    case 'forbidden':
      return (
        <Alert
          variant="custom"
          customIcon={<LockIcon />}
          isInline
          title="Device request details unavailable"
          data-testid="device-requests-forbidden"
        >
          You do not have permission to view this template in {projectLabel}. Contact your
          administrator for access.
        </Alert>
      );
    case 'error':
      return (
        <Alert
          variant="danger"
          isInline
          title="Device request details could not be loaded"
          data-testid="device-requests-error"
        >
          {lookup.error.message}
        </Alert>
      );
  }
};

/** Requested configuration from the ResourceClaimTemplate; never an allocation. */
const DeviceRequestsSection: React.FC<DeviceRequestsSectionProps> = ({
  templateName,
  namespace,
  lookup,
}) => {
  const requests = React.useMemo(
    () =>
      lookup.status === 'loaded' ? normalizeResourceClaimTemplateRequests(lookup.resource) : [],
    [lookup],
  );
  const statusContent = renderLookupStatus(lookup, namespace);
  const isLoaded = lookup.status === 'loaded';
  return (
    <Stack hasGutter data-testid="hardware-profile-device-requests">
      <StackItem>
        <DescriptionList>
          <DescriptionListGroup>
            <DescriptionListTerm>Claim template</DescriptionListTerm>
            <DescriptionListDescription data-testid="device-requests-claim-template">
              <Truncate content={templateName} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          {requests.map((request, index) => renderRequest(request, index, requests.length > 1))}
        </DescriptionList>
      </StackItem>
      {isLoaded && requests.length === 0 && (
        <StackItem data-testid="device-requests-empty">
          This template has no device requests.
        </StackItem>
      )}
      {statusContent && <StackItem>{statusContent}</StackItem>}
    </Stack>
  );
};

export default DeviceRequestsSection;

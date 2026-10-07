import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import ClaimsSection from '@odh-dashboard/hardware-profiles/shared/dra/ClaimsSection';
import { POLL_INTERVAL } from '@odh-dashboard/ui-core/utilities';
import { useDeploymentClaims } from '../../../hooks/useDeploymentClaims';
import type { Deployment } from '../../../../extension-points';

type DeploymentClaimsItemProps = {
  deployment: Deployment;
  /** Row expansion; nothing is fetched while collapsed. */
  isVisible: boolean;
};

/** Claims grouped per workload Pod; renders nothing for a deployment whose Pods declare none. */
const DeploymentClaimsItem: React.FC<DeploymentClaimsItemProps> = ({ deployment, isVisible }) => {
  const { hasClaims, podsError, groups, containerNames } = useDeploymentClaims(deployment, {
    enabled: isVisible,
    // The standard resource poll, armed only while the row is expanded, so allocation changes show without a re-expand.
    refreshRate: POLL_INTERVAL,
  });

  if (!hasClaims) {
    return null;
  }
  return (
    <DescriptionList
      isHorizontal
      horizontalTermWidthModifier={{ default: '250px' }}
      data-testid="deployment-claims-section"
    >
      <DescriptionListGroup>
        <DescriptionListTerm>Claims</DescriptionListTerm>
        <DescriptionListDescription>
          <ClaimsSection
            groups={groups}
            namespace={deployment.model.metadata.namespace}
            containerNames={containerNames}
            containerLabel="model server container"
            collapsibleGroups
            showTitle={false}
            // Claims only exist once Pods are loaded, so a watch error can only be a later refresh failure.
            loadError={podsError}
          />
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default DeploymentClaimsItem;

import React from 'react';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useListAuthPolicies } from '~/app/hooks/useListAuthPolicies';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import AuthPoliciesTable from '~/app/pages/auth-policies/allAuthPolicies/AuthPoliciesTable';
import DeleteAuthPolicyModal from '~/app/pages/auth-policies/DeleteAuthPolicyModal';
import AuthPoliciesToolbar from '~/app/pages/auth-policies/allAuthPolicies/AuthPoliciesToolbar';
import {
  AuthPoliciesFilterDataType,
  AuthPoliciesFilterOptions,
  initialAuthPoliciesFilterData,
} from '~/app/pages/auth-policies/allAuthPolicies/const';
import {
  EventTrackingResourceType,
  EventTrackingSource,
  MaaSEvents,
} from '~/app/types/event-tracking';
import EmptyStatePage from './EmptyStatePage';

type AuthPoliciesTabProps = {
  returnTo?: string;
};

const AuthPoliciesTab: React.FC<AuthPoliciesTabProps> = ({ returnTo }) => {
  const [authPolicies, loaded, error, refresh] = useListAuthPolicies();
  const [deleteAuthPolicy, setDeleteAuthPolicy] = React.useState<MaaSAuthPolicy | undefined>(
    undefined,
  );
  const [filterData, setFilterData] = React.useState<AuthPoliciesFilterDataType>(
    initialAuthPoliciesFilterData,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) =>
      setFilterData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialAuthPoliciesFilterData), []);

  const filteredAuthPolicies = React.useMemo(() => {
    const keyword = filterData[AuthPoliciesFilterOptions.keyword]?.toLowerCase();

    return authPolicies.filter((policy) => {
      if (keyword) {
        const displayedName = (policy.displayName ?? policy.name).toLowerCase();
        return (
          displayedName.includes(keyword) ||
          (policy.description ?? '').toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  }, [authPolicies, filterData]);

  if (!loaded && !error) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection isFilled>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Error loading authorization policies"
          variant={EmptyStateVariant.lg}
          data-testid="error-empty-state"
        >
          <EmptyStateBody data-testid="error-empty-state-body">{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (authPolicies.length === 0) {
    return (
      <EmptyStatePage
        returnTo={returnTo}
        testId="empty-auth-policies-page"
        title="No authorization policies"
        bodyText="Authorization policies control which user groups can access MaaS models. Create a policy to define model access permissions."
        showPoliciesButton
      />
    );
  }

  return (
    <>
      {loaded && (
        <PageSection isFilled>
          <AuthPoliciesTable
            authPolicies={filteredAuthPolicies}
            setDeleteAuthPolicy={setDeleteAuthPolicy}
            onClearFilters={onClearFilters}
            toolbarContent={
              <AuthPoliciesToolbar
                filterData={filterData}
                onFilterUpdate={onFilterUpdate}
                returnTo={returnTo}
              />
            }
            returnTo={returnTo}
          />
        </PageSection>
      )}
      {deleteAuthPolicy && (
        <DeleteAuthPolicyModal
          authPolicy={deleteAuthPolicy}
          onClose={(deleted?: boolean) => {
            if (deleted) {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.AUTHPOLICY,
                source: EventTrackingSource.LIST_KEBAB,
                resourceStatus: deleteAuthPolicy.phase ?? '',
                outcome: TrackingOutcome.submit,
              });
              refresh();
            } else {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.AUTHPOLICY,
                source: EventTrackingSource.LIST_KEBAB,
                resourceStatus: deleteAuthPolicy.phase ?? '',
                outcome: TrackingOutcome.cancel,
              });
            }
            setDeleteAuthPolicy(undefined);
          }}
        />
      )}
    </>
  );
};

export default AuthPoliciesTab;

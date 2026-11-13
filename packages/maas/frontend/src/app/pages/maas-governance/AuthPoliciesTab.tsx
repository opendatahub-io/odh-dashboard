import React from 'react';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
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
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
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
  MaaSResourceDeletedProperties,
} from '~/app/types/event-tracking';
import EmptyStatePage from './EmptyStatePage';

type AuthPoliciesTabProps = {
  returnTo?: string;
};

const AuthPoliciesTab: React.FC<AuthPoliciesTabProps> = ({ returnTo }) => {
  const {
    policies: authPolicies,
    policiesLoaded: loaded,
    policiesError: error,
    refresh,
  } = useMaaSGovernanceContext();
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
    // A typeahead selection is stored as { label, value } and matches exactly;
    // a plain string is a typed partial text fragment and matches by inclusion.
    const asSelection = (value: string | { label: string; value: string } | undefined) =>
      typeof value === 'string' ? undefined : value;
    const asFragment = (value: string | { label: string; value: string } | undefined) => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const trimmed = value.trim().toLowerCase();
      return trimmed || undefined;
    };
    const includes = (text: string | undefined, keyword: string) =>
      text?.toLowerCase().includes(keyword) ?? false;

    const modelSelection = asSelection(filterData[AuthPoliciesFilterOptions.model]);
    const groupSelection = asSelection(filterData[AuthPoliciesFilterOptions.group]);
    const policySelection = asSelection(filterData[AuthPoliciesFilterOptions.policy]);
    const modelFragment = asFragment(filterData[AuthPoliciesFilterOptions.model]);
    const groupFragment = asFragment(filterData[AuthPoliciesFilterOptions.group]);
    const policyFragment = asFragment(filterData[AuthPoliciesFilterOptions.policy]);

    if (
      !modelSelection &&
      !groupSelection &&
      !policySelection &&
      !modelFragment &&
      !groupFragment &&
      !policyFragment
    ) {
      return authPolicies;
    }

    return authPolicies.filter((policy) => {
      if (
        (modelSelection && !policy.modelRefs.some((ref) => ref.name === modelSelection.value)) ||
        (modelFragment &&
          !policy.modelRefs.some(
            (ref) => includes(ref.name, modelFragment) || includes(ref.displayName, modelFragment),
          ))
      ) {
        return false;
      }
      if (
        (groupSelection &&
          !policy.subjects.groups?.some((group) => group.name === groupSelection.value)) ||
        (groupFragment &&
          !policy.subjects.groups?.some((group) => includes(group.name, groupFragment)))
      ) {
        return false;
      }
      if (
        (policySelection && policy.name !== policySelection.value) ||
        (policyFragment &&
          !includes(policy.name, policyFragment) &&
          !includes(policy.displayName, policyFragment))
      ) {
        return false;
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
                authPolicies={authPolicies}
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
              } satisfies MaaSResourceDeletedProperties);
              refresh();
            } else {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.AUTHPOLICY,
                source: EventTrackingSource.LIST_KEBAB,
                resourceStatus: deleteAuthPolicy.phase ?? '',
                outcome: TrackingOutcome.cancel,
              } satisfies MaaSResourceDeletedProperties);
            }
            setDeleteAuthPolicy(undefined);
          }}
        />
      )}
    </>
  );
};

export default AuthPoliciesTab;

import React from 'react';
import { Alert, Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { useListAuthPolicies } from '~/app/hooks/useListAuthPolicies';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import AuthPoliciesTable from '~/app/pages/auth-policies/allAuthPolicies/AuthPoliciesTable';
import EmptyAuthPoliciesPage from '~/app/pages/auth-policies/EmptyAuthPoliciesPage';
import DeleteAuthPolicyModal from '~/app/pages/auth-policies/DeleteAuthPolicyModal';
import AuthPoliciesToolbar from '~/app/pages/auth-policies/allAuthPolicies/AuthPoliciesToolbar';
import {
  AuthPoliciesFilterDataType,
  AuthPoliciesFilterOptions,
  initialAuthPoliciesFilterData,
} from '~/app/pages/auth-policies/allAuthPolicies/const';

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
        <Alert variant="danger" isInline title="Error loading authorization policies">
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  if (authPolicies.length === 0) {
    return <EmptyAuthPoliciesPage returnTo={returnTo} />;
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
              refresh();
            }
            setDeleteAuthPolicy(undefined);
          }}
        />
      )}
    </>
  );
};

export default AuthPoliciesTab;

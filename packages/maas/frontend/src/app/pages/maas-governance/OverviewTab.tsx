import * as React from 'react';
import { Alert, Bullseye, PageSection, Spinner, ToolbarItem } from '@patternfly/react-core';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import { URL_PREFIX } from '~/app/utilities/const';
import { buildOverviewGroups } from '~/app/utilities/buildOverviewRows';
import OverviewTable from './overview/OverviewTable';
import OverviewToolbar from './overview/OverviewToolbar';
import OverviewViewToggle from './overview/OverviewViewToggle';
import GroupsTable from './overview/GroupsTable';
import {
  initialOverviewFilterData,
  OverviewFilterDataType,
  OverviewFilterOptions,
} from './overview/const';
import { filterOverviewGroups, filterOverviewModels } from './overview/utils';
import EmptyStatePage from './EmptyStatePage';

const OVERVIEW_RETURN_TO = `${URL_PREFIX}/maas-governance/overview`;

const OverviewTab: React.FC = () => {
  const location = useLocation();

  const {
    overviewRows: rows,
    overviewLoaded: loaded,
    overviewError: error,
    modelRefs,
    subscriptions,
    policies,
  } = useMaaSGovernanceContext();

  const [filterData, setFilterData] = React.useState<OverviewFilterDataType>(() => {
    const fromState = location.state?.overviewFilter?.modelName;
    if (typeof fromState !== 'string' || !fromState.trim()) {
      return initialOverviewFilterData;
    }
    return {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: fromState,
    };
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'groups' ? 'groups' : 'models';

  const onSelectView = React.useCallback(
    (nextView: 'models' | 'groups') => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextView === 'groups') {
            next.set('view', 'groups');
          } else {
            next.delete('view');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) => {
      setFilterData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialOverviewFilterData), []);

  const filteredRows = React.useMemo(
    () => filterOverviewModels(rows, filterData),
    [rows, filterData],
  );

  const groupRows = React.useMemo(
    () => buildOverviewGroups(subscriptions, policies),
    [subscriptions, policies],
  );
  const filteredGroupRows = React.useMemo(
    () => filterOverviewGroups(groupRows, filterData),
    [groupRows, filterData],
  );

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
        <Alert variant="danger" isInline title="Error loading overview data">
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  if (rows.length === 0) {
    const hasGovernanceResources = subscriptions.length > 0 || policies.length > 0;
    const noModels = modelRefs.length === 0;
    return (
      <PageSection isFilled>
        <EmptyStatePage
          returnTo={OVERVIEW_RETURN_TO}
          title={
            noModels && hasGovernanceResources
              ? 'No registered MaaS models'
              : 'No subscriptions or policies configured'
          }
          bodyText={
            noModels && hasGovernanceResources
              ? 'Subscriptions or authorization policies exist, but there are no registered MaaS models to show in the overview.'
              : 'Create subscriptions to define rate limits and authorization policies to control which groups can access MaaS models.'
          }
          showSubsButton
          showPoliciesButton
          testId="empty-overview-page"
        />
      </PageSection>
    );
  }

  const toolbarContent = (
    <>
      <ToolbarItem>
        <OverviewViewToggle view={view} onChange={onSelectView} />
      </ToolbarItem>
      <OverviewToolbar
        filterData={filterData}
        onFilterUpdate={onFilterUpdate}
        rows={rows}
        returnTo={OVERVIEW_RETURN_TO}
      />
    </>
  );

  return (
    <PageSection isFilled>
      {view === 'groups' ? (
        <GroupsTable
          data={filteredGroupRows}
          onClearFilters={onClearFilters}
          toolbarContent={toolbarContent}
        />
      ) : (
        <OverviewTable
          data={filteredRows}
          onClearFilters={onClearFilters}
          toolbarContent={toolbarContent}
        />
      )}
    </PageSection>
  );
};

export default OverviewTab;

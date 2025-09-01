import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { SearchIcon, PathMissingIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DataSourceDetailsTabs from './DataSourceTabs';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureStoreDataSourceByName from '../../../apiHooks/useFeatureStoreDataSourceByName';
import { featureStoreRootRoute } from '../../../routes';

const DataSourceDetailsPage = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const { dataSourceName } = useParams();
  const {
    data: dataSource,
    loaded: dataSourceLoaded,
    error: dataSourceLoadError,
  } = useFeatureStoreDataSourceByName(currentProject, dataSourceName);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No data sources"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No data sources have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  const errorState = (
    <EmptyState
      headingLevel="h6"
      icon={PathMissingIcon}
      titleText="Data source not found"
      variant={EmptyStateVariant.lg}
      data-testid="error-state-title"
    >
      <EmptyStateBody data-testid="error-state-body">
        {dataSourceLoadError?.message || 'The requested data source could not be found.'}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Link to={`${featureStoreRootRoute()}/dataSources`}>Go to Data Sources</Link>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={!dataSourceLoaded}
      emptyStatePage={emptyState}
      title={dataSource.name}
      data-testid="dataSource-details-page"
      description={dataSource.description}
      loadError={dataSourceLoadError}
      loadErrorPage={dataSourceLoadError ? errorState : undefined}
      loaded={dataSourceLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={`${featureStoreRootRoute()}/dataSources`}>Data Sources</Link>}
            data-testid="data-source-details-breadcrumb-link"
          />
          <BreadcrumbItem
            data-testid="data-source-details-breadcrumb-item"
            isActive
            style={{
              textDecoration: 'underline',
              textUnderlineOffset: ExtraSmallSpacerSize.var,
            }}
          >
            {dataSourceName}
          </BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <DataSourceDetailsTabs dataSource={dataSource} />
    </ApplicationsPage>
  );
};

export default DataSourceDetailsPage;

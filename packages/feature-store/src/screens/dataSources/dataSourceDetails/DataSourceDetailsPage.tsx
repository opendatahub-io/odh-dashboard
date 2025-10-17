import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  EmptyStateFooter,
  EmptyStateActions,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { SearchIcon, PathMissingIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DataSourceDetailsTabs from './DataSourceTabs';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureStoreDataSourceByName from '../../../apiHooks/useFeatureStoreDataSourceByName';
import { featureStoreRootRoute } from '../../../routes';
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../components/FeatureStoreBreadcrumb';
import FeatureStoreLabels from '../../../components/FeatureStoreLabels';
import { getDataSourceConnectorType } from '../utils';
import FeatureStoreAccessDenied from '../../../components/FeatureStoreAccessDenied';
import { isNotFoundError } from '../../../utils';
import { getFeatureStoreErrorMessage } from '../../../api/errorUtils';

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
        {getFeatureStoreErrorMessage(
          dataSourceLoadError,
          'The requested data source could not be found.',
        )}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Link to={`${featureStoreRootRoute()}/data-sources`}>Go to Data sources</Link>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  const loadErrorState = isNotFoundError(dataSourceLoadError) ? (
    errorState
  ) : (
    <FeatureStoreAccessDenied resourceType="data source" projectName={currentProject} />
  );

  return (
    <ApplicationsPage
      empty={!dataSourceLoaded}
      emptyStatePage={emptyState}
      title={
        dataSourceLoaded && (
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{dataSource.name}</FlexItem>
            <FlexItem>
              <FeatureStoreLabels color="blue">
                {getDataSourceConnectorType(dataSource.type)}
              </FeatureStoreLabels>
            </FlexItem>
          </Flex>
        )
      }
      data-testid="data-source-details-page"
      description={dataSource.description}
      loadError={dataSourceLoadError}
      loadErrorPage={dataSourceLoadError ? loadErrorState : undefined}
      loaded={dataSourceLoaded}
      provideChildrenPadding
      breadcrumb={
        <FeatureStorePageTitle
          isDetailsPage
          breadcrumb={
            <Breadcrumb>
              <FeatureStoreBreadcrumb
                pageName="Data sources"
                projectName={currentProject || ''}
                linkTo={`${featureStoreRootRoute()}/data-sources`}
                dataTestId="data-source-details-breadcrumb-link"
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
        />
      }
    >
      <DataSourceDetailsTabs dataSource={dataSource} />
    </ApplicationsPage>
  );
};

export default DataSourceDetailsPage;

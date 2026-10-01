import * as React from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  MODEL_DEPLOYMENT_SETTINGS_PATH,
  MODEL_DEPLOYMENT_SETTINGS_TITLE,
  RUNTIME_CATALOG_TAB_PATH,
  RUNTIME_CATALOG_TITLE,
} from './const';

const RuntimeCatalogDetailsView: React.FC = () => {
  const { runtimeName = 'Unknown' } = useParams<{ runtimeName: string }>();

  return (
    <ApplicationsPage
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={MODEL_DEPLOYMENT_SETTINGS_PATH}>{MODEL_DEPLOYMENT_SETTINGS_TITLE}</Link>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Link to={RUNTIME_CATALOG_TAB_PATH}>{RUNTIME_CATALOG_TITLE}</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive data-testid="breadcrumb-runtime-name">
            {runtimeName}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={runtimeName}
      loaded
      empty={false}
      provideChildrenPadding
    >
      <EmptyState
        icon={CubesIcon}
        headingLevel="h2"
        data-testid="runtime-catalog-details-placeholder"
      >
        <EmptyStateBody>Runtime details are under construction. Check back soon.</EmptyStateBody>
      </EmptyState>
    </ApplicationsPage>
  );
};

export default RuntimeCatalogDetailsView;

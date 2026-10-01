import * as React from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import { RUNTIME_CATALOG_TITLE } from './const';

export type RuntimeCatalogDetailsViewProps = {
  settingsHref: string;
  settingsTitle: string;
  catalogHref: string;
};

const RuntimeCatalogDetailsView: React.FC<RuntimeCatalogDetailsViewProps> = ({
  settingsHref,
  settingsTitle,
  catalogHref,
}) => {
  const { runtimeName = 'Unknown' } = useParams<{ runtimeName: string }>();

  return (
    <ApplicationsPage
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={settingsHref}>{settingsTitle}</Link>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Link to={catalogHref}>{RUNTIME_CATALOG_TITLE}</Link>
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

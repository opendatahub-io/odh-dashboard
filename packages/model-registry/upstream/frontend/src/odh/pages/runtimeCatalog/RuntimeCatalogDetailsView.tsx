import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateBody,
  PageSection,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

export type RuntimeCatalogDetailsViewProps = {
  breadcrumbs: { title: string; href: string }[];
};

const RuntimeCatalogDetailsView: React.FC<RuntimeCatalogDetailsViewProps> = ({ breadcrumbs }) => {
  const { runtimeName } = useParams<{ runtimeName: string }>();
  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb>
          {breadcrumbs.map(({ title, href }) => (
            <BreadcrumbItem key={href} render={() => <Link to={href}>{title}</Link>} />
          ))}
          <BreadcrumbItem isActive>{runtimeName}</BreadcrumbItem>
        </Breadcrumb>
      </PageSection>
      <PageSection hasBodyWrapper={false} data-testid="runtime-catalog-details">
        <EmptyState
          headingLevel="h1"
          icon={CubesIcon}
          titleText={`Runtime: ${runtimeName ?? 'Unknown'}`}
        >
          <EmptyStateBody>
            Runtime catalog details will be available here. This page is under construction.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    </>
  );
};

export default RuntimeCatalogDetailsView;

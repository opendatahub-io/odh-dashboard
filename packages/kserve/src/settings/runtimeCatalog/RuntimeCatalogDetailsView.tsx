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
import { MODEL_DEPLOYMENT_SETTINGS_PATH, RUNTIME_CATALOG_TAB_PATH } from './paths';

const RuntimeCatalogDetailsView: React.FC = () => {
  const { runtimeName } = useParams<{ runtimeName: string }>();

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to={MODEL_DEPLOYMENT_SETTINGS_PATH}>Model deployment settings</Link>
            )}
          />
          <BreadcrumbItem
            render={() => <Link to={RUNTIME_CATALOG_TAB_PATH}>Runtime image library</Link>}
          />
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

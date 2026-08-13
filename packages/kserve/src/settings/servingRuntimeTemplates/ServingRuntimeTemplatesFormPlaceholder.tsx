import * as React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { SERVING_RUNTIME_TEMPLATES_TAB_PATH } from './paths';

const MODE_TITLE: Record<'add' | 'edit' | 'duplicate', string> = {
  add: 'Add serving runtime',
  edit: 'Edit serving runtime',
  duplicate: 'Duplicate serving runtime',
};

type ServingRuntimeTemplatesFormPlaceholderProps = {
  mode: 'add' | 'edit' | 'duplicate';
};

/**
 * Placeholder for the serving runtime add/edit/duplicate forms while they still
 * live on the standalone page. RHOAIENG-68986 replaces this with the real form.
 * https://issues.redhat.com/browse/RHOAIENG-68986
 */
const ServingRuntimeTemplatesFormPlaceholder: React.FC<
  ServingRuntimeTemplatesFormPlaceholderProps
> = ({ mode }) => {
  const title = MODE_TITLE[mode];
  return (
    <ApplicationsPage
      title={title}
      loaded
      empty={false}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to={SERVING_RUNTIME_TEMPLATES_TAB_PATH}>Serving runtime templates</Link>
            )}
          />
          <BreadcrumbItem isActive>{title}</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <EmptyState
        headingLevel="h2"
        icon={WrenchIcon}
        titleText={title}
        data-testid="serving-runtime-form-placeholder"
      >
        <EmptyStateBody>
          This form is under construction. Serving runtime form migration is tracked in
          RHOAIENG-68986.
        </EmptyStateBody>
      </EmptyState>
    </ApplicationsPage>
  );
};

export default ServingRuntimeTemplatesFormPlaceholder;

import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
} from '@odh-dashboard/model-serving/shared';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';
import ServingRuntimeTemplateFormBody from './ServingRuntimeTemplateFormBody';
import { SERVING_RUNTIME_TEMPLATES_TAB_PATH } from './paths';

type CustomServingRuntimeAddTemplateProps = {
  mode: 'add' | 'edit' | 'duplicate';
  sourceTemplate?: TemplateKind;
};

const CustomServingRuntimeAddTemplate: React.FC<CustomServingRuntimeAddTemplateProps> = ({
  mode,
  sourceTemplate,
}) => {
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';
  const listPath = SERVING_RUNTIME_TEMPLATES_TAB_PATH;
  return (
    <ApplicationsPage
      title={
        isEdit && sourceTemplate
          ? `Edit ${getServingRuntimeDisplayNameFromTemplate(sourceTemplate)}`
          : `${isDuplicate ? 'Duplicate' : 'Add'} serving runtime`
      }
      description={
        isEdit
          ? 'Modify properties for your serving runtime.'
          : isDuplicate
          ? 'Add a new, editable runtime by duplicating an existing runtime.'
          : 'Add a new runtime that will be available for users on this cluster.'
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={listPath}>Serving runtime templates</Link>} />
          {isEdit && sourceTemplate && (
            <BreadcrumbItem>
              {getServingRuntimeDisplayNameFromTemplate(sourceTemplate)}
            </BreadcrumbItem>
          )}
          <BreadcrumbItem isActive>
            {isEdit ? 'Edit' : isDuplicate ? 'Duplicate' : 'Add'} serving runtime
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <ServingRuntimeTemplateFormBody mode={mode} sourceTemplate={sourceTemplate} />
    </ApplicationsPage>
  );
};
export default CustomServingRuntimeAddTemplate;

export const ServingRuntimeTemplateFormByName: React.FC<{
  mode: 'edit' | 'duplicate';
}> = ({ mode }) => {
  const listPath = SERVING_RUNTIME_TEMPLATES_TAB_PATH;
  const { servingRuntimeName } = useParams<{ servingRuntimeName: string }>();
  const {
    servingRuntimeTemplates: [templates],
  } = React.useContext(CustomServingRuntimeContext);
  const sourceTemplate = templates.find(
    (template) => getServingRuntimeNameFromTemplate(template) === servingRuntimeName,
  );

  // The named template must exist (the provider gates on loaded context). When it
  // doesn't — a deep link or reload to a deleted/renamed runtime — explain rather
  // than silently redirect. Matches the source EditTemplate not-found state,
  // generalized to cover duplicate.
  if (!sourceTemplate) {
    const operationLabel = mode === 'duplicate' ? 'Duplicate' : 'Edit';
    return (
      <ApplicationsPage
        loaded
        empty={false}
        title={`${operationLabel} serving runtime`}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem render={() => <Link to={listPath}>Serving runtime templates</Link>} />
            <BreadcrumbItem isActive>{operationLabel} serving runtime</BreadcrumbItem>
          </Breadcrumb>
        }
        provideChildrenPadding
      >
        <Bullseye>
          <EmptyState
            headingLevel="h2"
            icon={ExclamationCircleIcon}
            titleText={`Unable to ${mode === 'duplicate' ? 'duplicate' : 'edit'} serving runtime`}
          >
            <EmptyStateBody>
              We were unable to find a serving runtime named &quot;{servingRuntimeName}&quot;.
            </EmptyStateBody>
            <EmptyStateFooter>
              <Button
                variant="primary"
                component={(props: React.ComponentProps<'a'>) => <Link {...props} to={listPath} />}
              >
                Return to the list
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      </ApplicationsPage>
    );
  }

  // Key by the resolved template so the form remounts (and re-seeds its state
  // from the new source) when the target runtime changes while this component
  // stays mounted — e.g. navigating directly from /edit/a to /edit/b. The form
  // seeds code/selectors from props via useState, which only run on mount.
  return (
    <CustomServingRuntimeAddTemplate
      key={sourceTemplate.metadata.name}
      mode={mode}
      sourceTemplate={sourceTemplate}
    />
  );
};

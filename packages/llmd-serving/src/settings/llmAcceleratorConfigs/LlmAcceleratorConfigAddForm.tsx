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
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';
import LlmAcceleratorConfigFormBody from './LlmAcceleratorConfigFormBody';
import { LLM_ACCELERATOR_CONFIGS_TAB_PATH } from './paths';
import type { LLMInferenceServiceConfigKind } from '../../types';

type FormMode = 'add' | 'edit' | 'duplicate';

type LlmAcceleratorConfigAddFormProps = {
  mode: FormMode;
  sourceConfig?: LLMInferenceServiceConfigKind;
};

const LlmAcceleratorConfigAddForm: React.FC<LlmAcceleratorConfigAddFormProps> = ({
  mode,
  sourceConfig,
}) => {
  const listPath = LLM_ACCELERATOR_CONFIGS_TAB_PATH;
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';

  const title =
    isEdit && sourceConfig
      ? `Edit ${getDisplayNameFromK8sResource(sourceConfig)}`
      : `${isDuplicate ? 'Duplicate' : 'Add'} LLM accelerator configuration`;

  const description = isEdit
    ? 'Modify properties for your accelerator configuration.'
    : isDuplicate
    ? 'Add a new, editable configuration by duplicating an existing one.'
    : 'Add a new accelerator configuration that will be available for users on this cluster.';

  return (
    <ApplicationsPage
      title={title}
      description={description}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={listPath}>LLM accelerator configurations</Link>}
          />
          {isEdit && sourceConfig && (
            <BreadcrumbItem>{getDisplayNameFromK8sResource(sourceConfig)}</BreadcrumbItem>
          )}
          <BreadcrumbItem isActive>
            {isEdit ? 'Edit' : isDuplicate ? 'Duplicate' : 'Add'} LLM accelerator configuration
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <LlmAcceleratorConfigFormBody mode={mode} sourceConfig={sourceConfig} />
    </ApplicationsPage>
  );
};

export const LlmAcceleratorConfigFormByName: React.FC<{
  mode: 'edit' | 'duplicate';
}> = ({ mode }) => {
  const listPath = LLM_ACCELERATOR_CONFIGS_TAB_PATH;
  const { configName } = useParams<{ configName: string }>();
  const { configs } = React.useContext(LlmAcceleratorConfigContext);
  const config = configs.find((c) => c.metadata.name === configName);

  // The named config must exist (context is already loaded — the provider gates
  // on that). When it doesn't, tell the user rather than silently redirecting —
  // a deep link or reload to a deleted/renamed config should explain what
  // happened. Matches the pattern used by serving runtimes, connection types,
  // and hardware profiles. The copy reflects the active operation so a missing
  // duplicate target isn't labelled as an edit.
  if (!config) {
    const operationLabel = mode === 'duplicate' ? 'Duplicate' : 'Edit';
    return (
      <ApplicationsPage
        loaded
        empty={false}
        title={`${operationLabel} LLM accelerator configuration`}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem
              render={() => <Link to={listPath}>LLM accelerator configurations</Link>}
            />
            <BreadcrumbItem isActive>{operationLabel}</BreadcrumbItem>
          </Breadcrumb>
        }
        provideChildrenPadding
      >
        <Bullseye>
          <EmptyState
            headingLevel="h2"
            icon={ExclamationCircleIcon}
            titleText={`Unable to ${
              mode === 'duplicate' ? 'duplicate' : 'edit'
            } accelerator configuration`}
          >
            <EmptyStateBody>
              We were unable to find an accelerator configuration named &quot;{configName}&quot;.
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

  return <LlmAcceleratorConfigAddForm mode={mode} sourceConfig={config} />;
};

export default LlmAcceleratorConfigAddForm;

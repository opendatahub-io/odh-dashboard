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
import { LlmInferenceServiceConfigContext } from './LlmInferenceServiceConfigContext';
import LlmInferenceServiceConfigFormBody from './LlmInferenceServiceConfigFormBody';
import { LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH } from './paths';
import type { LLMInferenceServiceConfigKind } from '../../types';

type FormMode = 'add' | 'edit' | 'duplicate';

type LlmInferenceServiceConfigAddFormProps = {
  mode: FormMode;
  sourceConfig?: LLMInferenceServiceConfigKind;
};

const LlmInferenceServiceConfigAddForm: React.FC<LlmInferenceServiceConfigAddFormProps> = ({
  mode,
  sourceConfig,
}) => {
  const listPath = LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH;
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';

  const title =
    isEdit && sourceConfig
      ? `Edit ${getDisplayNameFromK8sResource(sourceConfig)}`
      : `${isDuplicate ? 'Duplicate' : 'Add'} LLM inference service configuration`;

  const description = isEdit
    ? 'Modify properties for your inference service configuration.'
    : isDuplicate
    ? 'Add a new, editable configuration by duplicating an existing one.'
    : 'Add a new inference service configuration that will be available for users on this cluster.';

  return (
    <ApplicationsPage
      title={title}
      description={description}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={listPath}>LLM inference service configurations</Link>}
          />
          {isEdit && sourceConfig && (
            <BreadcrumbItem>{getDisplayNameFromK8sResource(sourceConfig)}</BreadcrumbItem>
          )}
          <BreadcrumbItem isActive>
            {isEdit ? 'Edit' : isDuplicate ? 'Duplicate' : 'Add'} LLM inference service
            configuration
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <LlmInferenceServiceConfigFormBody mode={mode} sourceConfig={sourceConfig} />
    </ApplicationsPage>
  );
};

export const LlmInferenceServiceConfigFormByName: React.FC<{
  mode: 'edit' | 'duplicate';
}> = ({ mode }) => {
  const listPath = LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH;
  const { configName } = useParams<{ configName: string }>();
  const { configs } = React.useContext(LlmInferenceServiceConfigContext);
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
        title={`${operationLabel} LLM inference service configuration`}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem
              render={() => <Link to={listPath}>LLM inference service configs</Link>}
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
            } inference service configuration`}
          >
            <EmptyStateBody>
              We were unable to find an inference service configuration named &quot;{configName}
              &quot;.
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

  return <LlmInferenceServiceConfigAddForm mode={mode} sourceConfig={config} />;
};

export default LlmInferenceServiceConfigAddForm;

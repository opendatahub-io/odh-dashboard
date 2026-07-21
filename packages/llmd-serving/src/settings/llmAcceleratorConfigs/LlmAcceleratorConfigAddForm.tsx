import * as React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import YAML from 'yaml';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { LlmAcceleratorConfigContext } from './LlmAcceleratorConfigContext';
import { overrideLlmConfigFields } from '../configYamlUtils';
import ConfigYAMLEditor from '../ConfigYAMLEditor';
import {
  createLLMInferenceServiceConfig,
  updateLLMInferenceServiceConfig,
} from '../../api/LLMInferenceServiceConfigs';
import { isConfigObject, cleanResourceForYAMLViewer } from '../../utils';
import { ConfigType, CONFIG_TYPE_LABEL } from '../../types';
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
  const navigate = useNavigate();
  const { dashboardNamespace } = useDashboardNamespace();
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';

  const initialData = React.useMemo(() => {
    if (!sourceConfig) {
      return undefined;
    }
    if (!isDuplicate) {
      return sourceConfig;
    }
    return {
      ...sourceConfig,
      metadata: {
        ...sourceConfig.metadata,
        name: `${sourceConfig.metadata.name}-copy`,
        annotations: {
          ...sourceConfig.metadata.annotations,
          'openshift.io/display-name': `Copy of ${getDisplayNameFromK8sResource(sourceConfig)}`,
        },
      },
    };
  }, [isDuplicate, sourceConfig]);

  const { data: nameDescData, onDataChange: onNameDescDataChange } = useK8sNameDescriptionFieldData(
    {
      initialData,
      editableK8sName: isDuplicate,
    },
  );

  const [version, setVersion] = React.useState(
    sourceConfig?.metadata.annotations?.['opendatahub.io/runtime-version'] ?? '',
  );

  const [yamlCode, setYamlCode] = React.useState(() => {
    if (!sourceConfig) {
      return '';
    }
    if (isDuplicate) {
      const cleanMeta = cleanResourceForYAMLViewer(sourceConfig.metadata);
      return YAML.stringify({
        ...sourceConfig,
        metadata: {
          ...cleanMeta,
          name: `${sourceConfig.metadata.name}-copy`,
          annotations: {
            ...cleanMeta.annotations,
            'openshift.io/display-name': `Copy of ${getDisplayNameFromK8sResource(sourceConfig)}`,
          },
        },
      });
    }
    return YAML.stringify(sourceConfig);
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const hasName = nameDescData.name.trim() !== '';
  const isDisabled = yamlCode === '' || !hasName || loading;

  const title =
    isEdit && sourceConfig
      ? `Edit ${getDisplayNameFromK8sResource(sourceConfig)}`
      : `${isDuplicate ? 'Duplicate' : 'Add'} LLM accelerator configuration`;

  const description = isEdit
    ? 'Modify properties for your accelerator configuration.'
    : isDuplicate
    ? 'Add a new, editable configuration by duplicating an existing one.'
    : 'Add a new accelerator configuration that will be available for users on this cluster.';

  const handleSubmit = React.useCallback(() => {
    let parsed: unknown;
    try {
      parsed = YAML.parse(yamlCode);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    if (!isConfigObject(parsed)) {
      setError(new Error('YAML must represent a valid kubernetes resource object'));
      return;
    }
    const config = overrideLlmConfigFields(parsed, {
      name: isEdit ? sourceConfig?.metadata.name : nameDescData.k8sName.value,
      namespace: dashboardNamespace,
      displayName: nameDescData.name,
      version,
      labels: { [CONFIG_TYPE_LABEL]: ConfigType.ACCELERATOR },
    });
    setLoading(true);
    const submitFn = isEdit
      ? updateLLMInferenceServiceConfig(config)
      : createLLMInferenceServiceConfig(config);
    submitFn
      .then(() => {
        navigate('..');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    yamlCode,
    isEdit,
    sourceConfig?.metadata.name,
    nameDescData,
    version,
    dashboardNamespace,
    navigate,
  ]);

  return (
    <ApplicationsPage
      title={title}
      description={description}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="..">LLM accelerator configurations</Link>} />
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
      <Form className="pf-v6-u-h-100">
        <K8sNameDescriptionField
          data={nameDescData}
          onDataChange={onNameDescDataChange}
          dataTestId="llm-accelerator-config"
          hideDescription
        />
        <FormGroup label="Version" fieldId="llm-accelerator-config-version">
          <TextInput
            id="llm-accelerator-config-version"
            data-testid="llm-accelerator-config-version"
            value={version}
            onChange={(_e, val) => setVersion(val)}
            placeholder="e.g. 0.16.0"
          />
        </FormGroup>
        <FormGroup
          label="LLMInferenceServiceConfig YAML"
          isRequired
          fieldId="llm-accelerator-config-yaml"
        >
          <ConfigYAMLEditor code={yamlCode} onCodeChange={setYamlCode} />
        </FormGroup>
        {error ? (
          <Alert
            isInline
            variant="danger"
            title={error.name}
            actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
          >
            {error.message}
          </Alert>
        ) : null}
        <ActionGroup>
          <Button
            isDisabled={isDisabled}
            variant="primary"
            data-testid="submit-button"
            isLoading={loading}
            onClick={handleSubmit}
          >
            {isEdit ? 'Update' : 'Create'}
          </Button>
          <Button
            isDisabled={loading}
            variant="link"
            data-testid="cancel-button"
            onClick={() => navigate('..')}
          >
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </ApplicationsPage>
  );
};

export const LlmAcceleratorConfigFormByName: React.FC<{ mode: 'edit' | 'duplicate' }> = ({
  mode,
}) => {
  const { configName } = useParams<{ configName: string }>();
  const { configs } = React.useContext(LlmAcceleratorConfigContext);
  const config = configs.find((c) => c.metadata.name === configName);

  if (!config) {
    return <Navigate to=".." replace />;
  }

  return <LlmAcceleratorConfigAddForm mode={mode} sourceConfig={config} />;
};

export default LlmAcceleratorConfigAddForm;

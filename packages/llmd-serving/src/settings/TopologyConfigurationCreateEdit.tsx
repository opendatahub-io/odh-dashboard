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
} from '@patternfly/react-core';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import YAML from 'yaml';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import {
  getDisplayNameFromK8sResource,
  isK8sNameDescriptionDataValid,
} from '@odh-dashboard/k8s-core';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import ConfigYAMLEditor from './ConfigYAMLEditor';
import {
  type LLMInferenceServiceConfigKind,
  LLMInferenceServiceConfigModel,
  TopologyType,
  TopologyTypeLabels,
  CONFIG_TYPE_LABEL,
  DASHBOARD_RESOURCE_LABEL,
} from '../types';
import {
  createLLMInferenceServiceConfig,
  patchLLMInferenceServiceConfig,
  useWatchTopologyConfigs,
} from '../api/LLMInferenceServiceConfigs';

const isConfigObject = (value: unknown): value is LLMInferenceServiceConfigKind =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stripServerManagedFields = (
  metadata: LLMInferenceServiceConfigKind['metadata'],
): Omit<
  LLMInferenceServiceConfigKind['metadata'],
  | 'resourceVersion'
  | 'uid'
  | 'creationTimestamp'
  | 'generation'
  | 'managedFields'
  | 'ownerReferences'
> => {
  const result = { ...metadata };
  delete result.resourceVersion;
  delete result.uid;
  delete result.creationTimestamp;
  delete result.generation;
  delete result.managedFields;
  delete result.ownerReferences;
  return result;
};

const TopologyConfigurationCreateEdit: React.FC = () => {
  const { topologyType, configName } = useParams<{
    topologyType?: string;
    configName?: string;
  }>();
  const navigate = useNavigate();
  const { state }: { state?: { sourceConfig: LLMInferenceServiceConfigKind } } = useLocation();
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();

  const isDuplicateMode = !!state?.sourceConfig;
  const isEditMode = !!configName && !isDuplicateMode;
  const [configs] = useWatchTopologyConfigs(dashboardNamespace);
  const existingConfig = React.useMemo(
    () => (configName ? configs.find((c) => c.metadata.name === configName) : undefined),
    [configs, configName],
  );

  const resolvedTopologyType = React.useMemo((): TopologyType | undefined => {
    if (existingConfig) {
      const label = existingConfig.metadata.labels?.[CONFIG_TYPE_LABEL];
      return Object.values(TopologyType).find((t) => t === label);
    }
    if (state?.sourceConfig) {
      const label = state.sourceConfig.metadata.labels?.[CONFIG_TYPE_LABEL];
      return Object.values(TopologyType).find((t) => t === label);
    }
    return Object.values(TopologyType).find((t) => t === topologyType);
  }, [existingConfig, state?.sourceConfig, topologyType]);

  const initialResource = React.useMemo(() => {
    if (existingConfig) {
      return existingConfig;
    }
    if (state?.sourceConfig) {
      const cleanMeta = stripServerManagedFields(state.sourceConfig.metadata);
      return {
        ...state.sourceConfig,
        metadata: {
          ...cleanMeta,
          name: `${state.sourceConfig.metadata.name}-copy`,
          annotations: {
            ...cleanMeta.annotations,
            'openshift.io/display-name': `Copy of ${getDisplayNameFromK8sResource(
              state.sourceConfig,
            )}`,
          },
        },
      };
    }
    return undefined;
  }, [existingConfig, state?.sourceConfig]);

  const k8sNameDesc = useK8sNameDescriptionFieldData({
    initialData: initialResource,
  });

  const [yamlCode, setYamlCode] = React.useState(() => {
    if (existingConfig) {
      return YAML.stringify(existingConfig);
    }
    if (state?.sourceConfig) {
      const cleanMeta = stripServerManagedFields(state.sourceConfig.metadata);
      return YAML.stringify({
        ...state.sourceConfig,
        metadata: {
          ...cleanMeta,
          name: `${state.sourceConfig.metadata.name}-copy`,
          annotations: {
            ...cleanMeta.annotations,
            'openshift.io/display-name': `Copy of ${getDisplayNameFromK8sResource(
              state.sourceConfig,
            )}`,
          },
        },
      });
    }
    return '';
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const topologyTypeLabel = resolvedTopologyType
    ? TopologyTypeLabels[resolvedTopologyType]
    : 'Unknown';

  const sourceDisplayName = state?.sourceConfig
    ? getDisplayNameFromK8sResource(state.sourceConfig)
    : '';

  const pageTitle = isDuplicateMode
    ? 'Duplicate llm-d topology configuration'
    : isEditMode
    ? `Edit ${k8sNameDesc.data.name || configName}`
    : `Add ${topologyTypeLabel} configuration`;

  const pageDescription = isDuplicateMode
    ? `Create a copy based on ${sourceDisplayName}. Update the configuration before saving.`
    : !isEditMode
    ? 'Add a new topology configuration that will be available for users on this cluster.'
    : undefined;

  const handleSubmit = async () => {
    if (!resolvedTopologyType) {
      return;
    }

    setLoading(true);
    setError(undefined);

    let parsedConfig: LLMInferenceServiceConfigKind;
    try {
      const parsed: unknown = YAML.parse(yamlCode);
      if (!isConfigObject(parsed)) {
        throw new Error('YAML must represent a valid object');
      }
      parsedConfig = parsed;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Invalid YAML'));
      setLoading(false);
      return;
    }

    const resourceName = isEditMode && configName ? configName : k8sNameDesc.data.k8sName.value;
    if (!resourceName) {
      setError(new Error('Name must contain at least one alphanumeric character'));
      setLoading(false);
      return;
    }

    const apiGroup = LLMInferenceServiceConfigModel.apiGroup ?? '';
    const apiVer = LLMInferenceServiceConfigModel.apiVersion;
    const newConfig: LLMInferenceServiceConfigKind = {
      ...parsedConfig,
      apiVersion: `${apiGroup}/${apiVer}`,
      kind: 'LLMInferenceServiceConfig',
      metadata: {
        ...parsedConfig.metadata,
        name: resourceName,
        namespace: dashboardNamespace,
        labels: {
          ...parsedConfig.metadata.labels,
          [CONFIG_TYPE_LABEL]: resolvedTopologyType,
          [DASHBOARD_RESOURCE_LABEL]: 'true',
        },
        annotations: {
          ...parsedConfig.metadata.annotations,
          'openshift.io/display-name': k8sNameDesc.data.name,
          'openshift.io/description': k8sNameDesc.data.description,
        },
      },
    };

    try {
      if (isEditMode && existingConfig) {
        await patchLLMInferenceServiceConfig(existingConfig, newConfig);
      } else {
        await createLLMInferenceServiceConfig(newConfig);
      }
      navigate('..');
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown error');
      setError(err);
      notification.error(
        `Error ${isEditMode ? 'updating' : 'creating'} configuration`,
        err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ApplicationsPage
      title={pageTitle}
      description={pageDescription}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="..">llm-d topology configurations</Link>} />
          <BreadcrumbItem isActive>{pageTitle}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
      data-testid="topology-config-create-edit-page"
    >
      <Form style={{ height: '100%' }}>
        <K8sNameDescriptionField
          data={k8sNameDesc.data}
          dataTestId="topology-config"
          onDataChange={k8sNameDesc.onDataChange}
        />
        <FormGroup
          label="LLMInferenceServiceConfig YAML"
          isRequired
          fieldId="config-yaml"
          style={{ flex: 1 }}
        >
          <ConfigYAMLEditor
            code={yamlCode}
            onCodeChange={setYamlCode}
            name={k8sNameDesc.data.k8sName.value}
            displayName={k8sNameDesc.data.name}
            description={k8sNameDesc.data.description}
            topologyType={resolvedTopologyType}
            topologyTypeLabel={topologyTypeLabel}
          />
        </FormGroup>
        {error && (
          <Alert
            isInline
            variant="danger"
            title={error.name}
            actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
          >
            {error.message}
          </Alert>
        )}
        <ActionGroup>
          <Button
            variant="primary"
            data-testid="submit-topology-config-button"
            isDisabled={
              !isK8sNameDescriptionDataValid(k8sNameDesc.data) || !yamlCode.trim() || loading
            }
            isLoading={loading}
            onClick={handleSubmit}
          >
            {isEditMode ? 'Update' : 'Create'}
          </Button>
          <Button
            variant="link"
            data-testid="cancel-topology-config-button"
            isDisabled={loading}
            onClick={() => navigate('..')}
          >
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </ApplicationsPage>
  );
};

export default TopologyConfigurationCreateEdit;

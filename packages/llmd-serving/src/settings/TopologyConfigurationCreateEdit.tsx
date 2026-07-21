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
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
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
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import ConfigYAMLEditor from './ConfigYAMLEditor';
import { overrideLlmConfigFields } from './configYamlUtils';
import {
  type LLMInferenceServiceConfigKind,
  TopologyType,
  TopologyTypeLabels,
  CONFIG_TYPE_LABEL,
} from '../types';
import { isConfigObject, cleanResourceForYAMLViewer, stripAnnotation } from '../utils';
import {
  createLLMInferenceServiceConfig,
  patchLLMInferenceServiceConfig,
  useWatchTopologyConfigs,
} from '../api/LLMInferenceServiceConfigs';

const TopologyConfigurationCreateEditInner: React.FC<{
  existingConfig?: LLMInferenceServiceConfigKind;
}> = ({ existingConfig }) => {
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
      const cleanMeta = cleanResourceForYAMLViewer(state.sourceConfig.metadata);
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
    editableK8sName: isDuplicateMode,
  });

  const [yamlCode, setYamlCode] = React.useState(() => {
    if (existingConfig) {
      return YAML.stringify(existingConfig);
    }
    if (state?.sourceConfig) {
      const cleanMeta = cleanResourceForYAMLViewer(state.sourceConfig.metadata);
      const cleanAnnotations = stripAnnotation(
        cleanMeta.annotations,
        'kubectl.kubernetes.io/last-applied-configuration',
      );
      return YAML.stringify({
        apiVersion: state.sourceConfig.apiVersion,
        kind: state.sourceConfig.kind,
        metadata: {
          ...cleanMeta,
          name: `${state.sourceConfig.metadata.name}-copy`,
          annotations: {
            ...cleanAnnotations,
            'openshift.io/display-name': `Copy of ${getDisplayNameFromK8sResource(
              state.sourceConfig,
            )}`,
          },
        },
        spec: state.sourceConfig.spec,
      });
    }
    return '';
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const [configSource, setConfigSource] = React.useState<'template' | 'editor' | undefined>(
    undefined,
  );
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [templateError, setTemplateError] = React.useState(false);

  React.useEffect(() => {
    if (!resolvedTopologyType || isEditMode || isDuplicateMode) {
      return;
    }
    setTemplateError(false);
    fetch(`/api/service/model-serving/api/v1/samples/llm-d?type=${resolvedTopologyType}`)
      .then((res) => {
        if (!res.ok) {
          setTemplateError(true);
        }
      })
      .catch(() => {
        setTemplateError(true);
      });
  }, [resolvedTopologyType, isEditMode, isDuplicateMode]);

  const handleConfigSourceChange = (key: string) => {
    if (key === 'template') {
      setConfigSource('template');
      if (!resolvedTopologyType) {
        return;
      }
      setTemplateLoading(true);
      fetch(`/api/service/model-serving/api/v1/samples/llm-d?type=${resolvedTopologyType}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Template not found');
          }
          return res.text();
        })
        .then((yaml) => {
          setYamlCode(yaml);
        })
        .catch(() => {
          setTemplateError(true);
          notification.error(
            'Unable to pull template',
            'No sample configuration found for this topology type.',
          );
        })
        .finally(() => {
          setTemplateLoading(false);
        });
    } else if (key === 'editor') {
      setConfigSource('editor');
      setYamlCode('');
    }
  };

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

  const showEditor =
    isEditMode ||
    isDuplicateMode ||
    configSource === 'editor' ||
    (configSource === 'template' && yamlCode !== '');

  const configSourceOptions: SimpleSelectOption[] = [
    {
      key: 'template',
      label: 'Start from a sample configuration file',
      isDisabled: templateError,
      isAriaDisabled: templateError,
      description: templateError ? 'Unable to pull template' : undefined,
    },
    {
      key: 'editor',
      label: 'Upload an existing configuration file',
    },
  ];

  const handleSubmit = async () => {
    if (!resolvedTopologyType) {
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const resourceName = isEditMode && configName ? configName : k8sNameDesc.data.k8sName.value;
      if (!resourceName) {
        throw new Error('Name must contain at least one alphanumeric character');
      }

      const parsed: unknown = YAML.parse(yamlCode);
      if (!isConfigObject(parsed)) {
        throw new Error('YAML must represent a valid kubernetes resource object');
      }

      const newConfig = overrideLlmConfigFields(parsed, {
        name: resourceName,
        namespace: dashboardNamespace,
        displayName: k8sNameDesc.data.name,
        description: k8sNameDesc.data.description,
        labels: { [CONFIG_TYPE_LABEL]: resolvedTopologyType },
      });

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
        {!isEditMode && !isDuplicateMode && (
          <FormGroup label="Configuration source" isRequired fieldId="config-source">
            <SimpleSelect
              options={configSourceOptions}
              value={configSource}
              placeholder="Select a configuration source..."
              onChange={handleConfigSourceChange}
              isDisabled={templateLoading}
              isFullWidth
              dataTestId="config-source-select"
            />
          </FormGroup>
        )}
        {showEditor && (
          <FormGroup
            label="LLMInferenceServiceConfig YAML"
            isRequired
            fieldId="config-yaml"
            style={{ flex: 1 }}
          >
            <ConfigYAMLEditor
              code={yamlCode}
              onCodeChange={setYamlCode}
              topologyTypeLabel={topologyTypeLabel}
            />
          </FormGroup>
        )}
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

const TopologyConfigurationCreateEdit: React.FC = () => {
  const { configName } = useParams<{ configName?: string }>();
  const { state }: { state?: { sourceConfig: LLMInferenceServiceConfigKind } } = useLocation();
  const { dashboardNamespace } = useDashboardNamespace();
  const [configs, loaded] = useWatchTopologyConfigs(dashboardNamespace);

  const isDuplicateMode = !!state?.sourceConfig;
  const isEditMode = !!configName && !isDuplicateMode;

  const existingConfig = React.useMemo(
    () => (configName ? configs.find((c) => c.metadata.name === configName) : undefined),
    [configs, configName],
  );

  if (isEditMode && !loaded) {
    return (
      <ApplicationsPage title="Edit topology configuration" loaded={false} empty={false}>
        {null}
      </ApplicationsPage>
    );
  }

  if (isEditMode && loaded && !existingConfig) {
    return (
      <ApplicationsPage title="Topology configuration not found" loaded empty={false}>
        <Navigate to=".." />
      </ApplicationsPage>
    );
  }

  return <TopologyConfigurationCreateEditInner existingConfig={existingConfig} />;
};

export default TopologyConfigurationCreateEdit;

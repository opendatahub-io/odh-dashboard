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
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import ConfigYAMLEditor from './ConfigYAMLEditor';
import { overrideLlmConfigFields } from './configYamlUtils';
import {
  type LLMInferenceServiceConfigKind,
  LLMInferenceServiceConfigModel,
  ConfigType,
  TopologyType,
  TopologyTypeLabels,
  CONFIG_TYPE_LABEL,
  SUPPORTED_TOPOLOGIES_ANNOTATION,
  DASHBOARD_RESOURCE_LABEL,
} from '../types';
import { isConfigObject, cleanResourceForYAMLViewer, stripAnnotation } from '../utils';
import {
  createLLMInferenceServiceConfig,
  patchLLMInferenceServiceConfig,
  useWatchRouterConfigs,
} from '../api/LLMInferenceServiceConfigs';

const SAMPLE_DISPLAY_NAME_ANNOTATION = 'openshift.io/display-name';
const SAMPLE_DESCRIPTION_ANNOTATION = 'description';

const resolveTopologyFromConfig = (
  config: LLMInferenceServiceConfigKind,
): TopologyType | undefined => {
  const raw = config.metadata.annotations?.[SUPPORTED_TOPOLOGIES_ANNOTATION];
  if (!raw) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 1) {
      return Object.values(TopologyType).find((t) => t === parsed[0]);
    }
  } catch {
    // invalid JSON — fall through
  }
  return undefined;
};

const buildRouterSamplesUrl = (topology: TopologyType): string =>
  `/api/service/model-serving/api/v1/samples/llm-d?type=router&topology=${topology}`;

const RoutingConfigurationCreateEditInner: React.FC<{
  existingConfig?: LLMInferenceServiceConfigKind;
}> = ({ existingConfig }) => {
  const navigate = useNavigate();
  const { state }: { state?: { sourceConfig: LLMInferenceServiceConfigKind } } = useLocation();
  const { configName } = useParams<{ configName?: string }>();
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();

  const isDuplicateMode = !!state?.sourceConfig;
  const isEditMode = !!configName && !isDuplicateMode;

  // --- Topology type state ---
  const [selectedTopology, setSelectedTopology] = React.useState<TopologyType | ''>(() => {
    const source = existingConfig ?? state?.sourceConfig;
    if (source) {
      return resolveTopologyFromConfig(source) ?? '';
    }
    return '';
  });

  // --- Configuration source state ---
  const [configSource, setConfigSource] = React.useState<'template' | 'editor' | undefined>(
    undefined,
  );
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [templateError, setTemplateError] = React.useState(false);

  // Probe API on topology change to check if a sample exists
  React.useEffect(() => {
    if (!selectedTopology || isEditMode || isDuplicateMode) {
      return undefined;
    }
    setTemplateError(false);
    setConfigSource(undefined);
    setYamlCode('');

    const controller = new AbortController();
    fetch(buildRouterSamplesUrl(selectedTopology), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          setTemplateError(true);
        }
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        setTemplateError(true);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopology, isEditMode, isDuplicateMode]);

  const handleConfigSourceChange = (key: string) => {
    if (key === 'template') {
      if (!selectedTopology) {
        return;
      }
      setConfigSource('template');
      setTemplateLoading(true);
      fetch(buildRouterSamplesUrl(selectedTopology))
        .then((res) => {
          if (!res.ok) {
            throw new Error('Template not found');
          }
          return res.text();
        })
        .then((yaml) => {
          setYamlCode(yaml);
          try {
            const parsed: unknown = YAML.parse(yaml);
            if (isConfigObject(parsed)) {
              const annotations = parsed.metadata.annotations ?? {};
              const sampleName =
                annotations[SAMPLE_DISPLAY_NAME_ANNOTATION] ?? parsed.metadata.name;
              const sampleDesc = annotations[SAMPLE_DESCRIPTION_ANNOTATION] ?? '';
              if (sampleName) {
                k8sNameDesc.onDataChange('name', String(sampleName));
              }
              if (sampleDesc) {
                k8sNameDesc.onDataChange('description', String(sampleDesc));
              }
            }
          } catch {
            // sample parsing for form fields is best-effort
          }
        })
        .catch(() => {
          setTemplateError(true);
          notification.error(
            'Unable to pull template',
            'No sample configuration found for the selected topology.',
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

  // --- Name/description and YAML state ---
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

  // --- Page chrome ---
  const sourceDisplayName = state?.sourceConfig
    ? getDisplayNameFromK8sResource(state.sourceConfig)
    : '';

  const pageTitle = isDuplicateMode
    ? 'Duplicate llm-d routing configuration'
    : isEditMode
    ? `Edit ${k8sNameDesc.data.name || configName}`
    : 'Add llm-d routing configuration';

  const pageDescription = isDuplicateMode
    ? `Create a copy based on ${sourceDisplayName}. Update the configuration before saving.`
    : !isEditMode
    ? 'Add a new routing configuration that will be available for users on this cluster.'
    : undefined;

  const showEditor =
    isEditMode ||
    isDuplicateMode ||
    configSource === 'editor' ||
    (configSource === 'template' && yamlCode !== '');

  // --- Topology type dropdown options (4 topology types) ---
  const topologyOptions: SimpleSelectOption[] = Object.values(TopologyType).map((tt) => ({
    key: tt,
    label: TopologyTypeLabels[tt],
  }));

  // --- Configuration source dropdown options ---
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

  // --- Submit ---
  const handleSubmit = async () => {
    if (!selectedTopology) {
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
        throw new Error('YAML must represent a valid object with a metadata block');
      }

      const withFormFields = overrideLlmConfigFields(parsed, {
        name: resourceName,
        displayName: k8sNameDesc.data.name,
        description: k8sNameDesc.data.description,
      });
      const apiGroup = LLMInferenceServiceConfigModel.apiGroup ?? '';
      const apiVer = LLMInferenceServiceConfigModel.apiVersion;

      const newConfig: LLMInferenceServiceConfigKind = {
        ...withFormFields,
        apiVersion: `${apiGroup}/${apiVer}`,
        kind: 'LLMInferenceServiceConfig',
        metadata: {
          ...withFormFields.metadata,
          namespace: dashboardNamespace,
          labels: {
            ...(withFormFields.metadata.labels ?? {}),
            [CONFIG_TYPE_LABEL]: ConfigType.ROUTER,
            [DASHBOARD_RESOURCE_LABEL]: 'true',
          },
          annotations: {
            ...(withFormFields.metadata.annotations ?? {}),
            [SUPPORTED_TOPOLOGIES_ANNOTATION]: JSON.stringify([selectedTopology]),
          },
        },
      };

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
          <BreadcrumbItem render={() => <Link to="..">llm-d routing configurations</Link>} />
          <BreadcrumbItem isActive>{pageTitle}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Form style={{ height: '100%' }}>
        <K8sNameDescriptionField
          data={k8sNameDesc.data}
          dataTestId="routing-config"
          onDataChange={k8sNameDesc.onDataChange}
        />
        <FormGroup label="Topology type" isRequired fieldId="topology-type-select">
          <SimpleSelect
            isFullWidth
            dataTestId="topology-type-select"
            value={selectedTopology || undefined}
            placeholder="Select topology type"
            isDisabled={isEditMode}
            options={topologyOptions}
            onChange={(key) => {
              const matched = Object.values(TopologyType).find((v) => v === key);
              if (matched) {
                setSelectedTopology(matched);
              }
            }}
          />
        </FormGroup>
        {!isEditMode && !isDuplicateMode && (
          <FormGroup label="Configuration source" isRequired fieldId="config-source">
            <SimpleSelect
              options={configSourceOptions}
              value={configSource}
              placeholder="Select a configuration source"
              onChange={handleConfigSourceChange}
              isDisabled={templateLoading || !selectedTopology}
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
              topologyTypeLabel="routing"
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
            data-testid="submit-routing-config-button"
            isDisabled={
              !isK8sNameDescriptionDataValid(k8sNameDesc.data) ||
              !selectedTopology ||
              !yamlCode.trim() ||
              loading
            }
            isLoading={loading}
            onClick={handleSubmit}
          >
            {isEditMode ? 'Update' : 'Create'}
          </Button>
          <Button
            variant="link"
            data-testid="cancel-routing-config-button"
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

const RoutingConfigurationCreateEdit: React.FC = () => {
  const { configName } = useParams<{ configName?: string }>();
  const { state }: { state?: { sourceConfig: LLMInferenceServiceConfigKind } } = useLocation();
  const { dashboardNamespace } = useDashboardNamespace();
  const [configs, loaded] = useWatchRouterConfigs(dashboardNamespace);

  const isDuplicateMode = !!state?.sourceConfig;
  const isEditMode = !!configName && !isDuplicateMode;

  const existingConfig = React.useMemo(
    () => (configName ? configs.find((c) => c.metadata.name === configName) : undefined),
    [configs, configName],
  );

  if (isEditMode && !loaded) {
    return (
      <ApplicationsPage title="Edit routing configuration" loaded={false} empty={false}>
        {null}
      </ApplicationsPage>
    );
  }

  if (isEditMode && loaded && !existingConfig) {
    return (
      <ApplicationsPage title="Routing configuration not found" loaded empty={false}>
        <Navigate to=".." />
      </ApplicationsPage>
    );
  }

  return <RoutingConfigurationCreateEditInner existingConfig={existingConfig} />;
};

export default RoutingConfigurationCreateEdit;

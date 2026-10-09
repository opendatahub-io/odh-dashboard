import * as React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Button,
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import YAML from 'yaml';
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '@odh-dashboard/k8s-core';
import { LLM_ACCELERATOR_CONFIGS_TAB_PATH } from './paths';
import { overrideLlmConfigFields } from '../configYamlUtils';
import ConfigYAMLEditor from '../ConfigYAMLEditor';
import {
  createLLMInferenceServiceConfig,
  updateLLMInferenceServiceConfig,
} from '../../api/LLMInferenceServiceConfigs';
import {
  isConfigObject,
  cleanResourceForYAMLViewer,
  stripDuplicatingAnnotations,
  stripDuplicatingLabels,
} from '../../utils';
import { ConfigType, CONFIG_TYPE_LABEL } from '../../types';
import type { LLMInferenceServiceConfigKind } from '../../types';
import {
  fireLlmAcceleratorConfigCreated,
  fireLlmAcceleratorConfigUpdated,
} from '../../tracking/llmdTrackingConstants';

type LlmAcceleratorConfigFormBodyProps =
  | {
      mode: 'add' | 'edit' | 'duplicate';
      sourceConfig?: LLMInferenceServiceConfigKind;
    }
  | {
      mode: 'install';
      sourceConfig: LLMInferenceServiceConfigKind;
      onBack: () => void;
      cancelReturnRoute: string;
    };

const LlmAcceleratorConfigFormBody: React.FC<LlmAcceleratorConfigFormBodyProps> = (props) => {
  const { mode, sourceConfig } = props;
  const listPath = LLM_ACCELERATOR_CONFIGS_TAB_PATH;
  const navigate = useNavigate();
  const { dashboardNamespace } = useDashboardNamespace();
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';
  const isInstall = mode === 'install';

  const initialData = React.useMemo(() => {
    if (!sourceConfig) {
      return undefined;
    }
    if (!isDuplicate) {
      return sourceConfig;
    }
    const duplicateDisplayName = `Copy of ${getDisplayNameFromK8sResource(sourceConfig)}`;
    return {
      ...sourceConfig,
      metadata: {
        ...sourceConfig.metadata,
        name: translateDisplayNameForK8s(duplicateDisplayName),
        annotations: {
          ...sourceConfig.metadata.annotations,
          'openshift.io/display-name': duplicateDisplayName,
        },
      },
    };
  }, [isDuplicate, sourceConfig]);

  const { data: nameDescData, onDataChange: onNameDescDataChange } = useK8sNameDescriptionFieldData(
    {
      initialData,
      editableK8sName: isDuplicate || isInstall,
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
      const cleanAnnotations = stripDuplicatingAnnotations(cleanMeta.annotations);
      const cleanLabels = stripDuplicatingLabels(cleanMeta.labels);
      const duplicateDisplayName = `Copy of ${getDisplayNameFromK8sResource(sourceConfig)}`;
      return YAML.stringify({
        ...sourceConfig,
        metadata: {
          ...cleanMeta,
          name: translateDisplayNameForK8s(duplicateDisplayName),
          annotations: {
            ...cleanAnnotations,
            'openshift.io/display-name': duplicateDisplayName,
          },
          labels: cleanLabels,
        },
      });
    }
    return YAML.stringify(sourceConfig);
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const hasName = nameDescData.name.trim() !== '';
  const isDisabled = yamlCode === '' || !hasName || loading;

  const handleSubmit = React.useCallback(() => {
    let parsed: unknown;
    try {
      parsed = YAML.parse(yamlCode);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      if (isEdit) {
        fireLlmAcceleratorConfigUpdated({ outcome: TrackingOutcome.submit, success: false });
      } else {
        fireLlmAcceleratorConfigCreated({
          outcome: TrackingOutcome.submit,
          success: false,
          mode,
        });
      }
      return;
    }
    if (!isConfigObject(parsed)) {
      setError(new Error('YAML must represent a valid kubernetes resource object'));
      if (isEdit) {
        fireLlmAcceleratorConfigUpdated({ outcome: TrackingOutcome.submit, success: false });
      } else {
        fireLlmAcceleratorConfigCreated({
          outcome: TrackingOutcome.submit,
          success: false,
          mode,
        });
      }
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
        if (isEdit) {
          fireLlmAcceleratorConfigUpdated({ outcome: TrackingOutcome.submit, success: true });
        } else {
          fireLlmAcceleratorConfigCreated({
            outcome: TrackingOutcome.submit,
            success: true,
            mode,
          });
        }
        navigate(listPath);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        if (isEdit) {
          fireLlmAcceleratorConfigUpdated({
            outcome: TrackingOutcome.submit,
            success: false,
          });
        } else {
          fireLlmAcceleratorConfigCreated({
            outcome: TrackingOutcome.submit,
            success: false,
            mode,
          });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    yamlCode,
    isEdit,
    mode,
    sourceConfig?.metadata.name,
    nameDescData,
    version,
    dashboardNamespace,
    navigate,
    listPath,
  ]);

  return (
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
        {isInstall && (
          <Button isDisabled={loading} variant="secondary" onClick={props.onBack}>
            Back
          </Button>
        )}
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
          onClick={() => {
            if (isEdit) {
              fireLlmAcceleratorConfigUpdated({ outcome: TrackingOutcome.cancel });
            } else {
              fireLlmAcceleratorConfigCreated({
                outcome: TrackingOutcome.cancel,
                mode,
              });
            }
            navigate(props.mode === 'install' ? props.cancelReturnRoute : listPath);
          }}
        >
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
};

export default LlmAcceleratorConfigFormBody;

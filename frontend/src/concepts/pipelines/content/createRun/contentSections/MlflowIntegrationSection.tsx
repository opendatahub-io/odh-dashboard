import * as React from 'react';
import {
  Checkbox,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  FormGroup,
  FormSection,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '#~/concepts/pipelines/content/createRun/const';
import {
  MlflowExperimentMode,
  MlflowFormData,
} from '#~/concepts/pipelines/content/createRun/types';
import { CharLimitHelperText } from '#~/components/CharLimitHelperText';
import { NAME_CHARACTER_LIMIT } from '#~/concepts/pipelines/content/const';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import MlflowExperimentSelector from '#~/concepts/mlflow/MlflowExperimentSelector';

const MLFLOW_AUTOLOG_SNIPPET = `import mlflow
mlflow.autolog()
with mlflow.start_run():
    # your training code goes here ...`;

type MlflowIntegrationSectionProps = {
  data: MlflowFormData;
  onChange: (data: MlflowFormData) => void;
  workspace: string;
};

const MlflowIntegrationSection: React.FC<MlflowIntegrationSectionProps> = ({
  data,
  onChange,
  workspace,
}) => {
  const isDisabled = !data.isExperimentTrackingEnabled;
  const [copied, setCopied] = React.useState(false);
  const lastModeRef = React.useRef(
    data.isExperimentTrackingEnabled ? data.mode : MlflowExperimentMode.EXISTING,
  );
  const lastExistingNameRef = React.useRef(
    data.isExperimentTrackingEnabled && data.mode === MlflowExperimentMode.EXISTING
      ? data.existingExperimentName
      : '',
  );
  const lastNewNameRef = React.useRef(
    data.isExperimentTrackingEnabled && data.mode === MlflowExperimentMode.NEW
      ? data.newExperimentName
      : '',
  );
  React.useEffect(() => {
    if (data.isExperimentTrackingEnabled) {
      lastModeRef.current = data.mode;
      if (data.mode === MlflowExperimentMode.EXISTING) {
        lastExistingNameRef.current = data.existingExperimentName;
      } else {
        lastNewNameRef.current = data.newExperimentName;
      }
    }
  }, [data]);
  const currentMode = data.isExperimentTrackingEnabled ? data.mode : lastModeRef.current;
  const existingExperimentName =
    data.isExperimentTrackingEnabled && data.mode === MlflowExperimentMode.EXISTING
      ? data.existingExperimentName
      : lastExistingNameRef.current;
  const newExperimentName =
    data.isExperimentTrackingEnabled && data.mode === MlflowExperimentMode.NEW
      ? data.newExperimentName
      : lastNewNameRef.current;

  const switchToExistingMode = React.useCallback(() => {
    onChange({
      isExperimentTrackingEnabled: true,
      mode: MlflowExperimentMode.EXISTING,
      existingExperimentName,
    });
  }, [existingExperimentName, onChange]);

  const switchToNewMode = React.useCallback(() => {
    onChange({
      isExperimentTrackingEnabled: true,
      mode: MlflowExperimentMode.NEW,
      newExperimentName,
    });
  }, [newExperimentName, onChange]);

  return (
    <FormSection
      id={CreateRunPageSections.MLFLOW_INTEGRATION}
      title={runPageSectionTitles[CreateRunPageSections.MLFLOW_INTEGRATION]}
    >
      <Checkbox
        id="mlflow-experiment-tracking-toggle"
        data-testid="mlflow-experiment-tracking-toggle"
        label="Enable MLflow experiment tracking"
        isChecked={data.isExperimentTrackingEnabled}
        onChange={(_e, checked) => {
          if (!checked) {
            onChange({ isExperimentTrackingEnabled: false });
            return;
          }

          if (lastModeRef.current === MlflowExperimentMode.NEW) {
            onChange({
              isExperimentTrackingEnabled: true,
              mode: MlflowExperimentMode.NEW,
              newExperimentName,
            });
          } else {
            onChange({
              isExperimentTrackingEnabled: true,
              mode: MlflowExperimentMode.EXISTING,
              existingExperimentName,
            });
          }
        }}
      />

      <Radio
        id="mlflow-existing"
        data-testid="mlflow-existing-radio"
        name="mlflow-experiment-mode"
        label="Choose existing MLflow experiment"
        isChecked={currentMode === MlflowExperimentMode.EXISTING}
        isDisabled={isDisabled}
        onChange={switchToExistingMode}
        body={
          currentMode === MlflowExperimentMode.EXISTING && (
            <FormGroup label="MLflow experiment" isRequired fieldId="mlflow-experiment-select">
              <MlflowExperimentSelector
                workspace={workspace}
                selection={existingExperimentName}
                isDisabled={isDisabled}
                onSelect={(experiment) =>
                  onChange({
                    isExperimentTrackingEnabled: true,
                    mode: MlflowExperimentMode.EXISTING,
                    existingExperimentName: experiment.name,
                  })
                }
              />
            </FormGroup>
          )
        }
      />

      <Radio
        id="mlflow-new"
        data-testid="mlflow-new-radio"
        name="mlflow-experiment-mode"
        label="Create new MLflow experiment"
        isChecked={currentMode === MlflowExperimentMode.NEW}
        isDisabled={isDisabled}
        onChange={switchToNewMode}
        body={
          currentMode === MlflowExperimentMode.NEW && (
            <FormGroup
              label="MLflow experiment name"
              isRequired
              fieldId="mlflow-new-experiment-name"
            >
              <TextInput
                id="mlflow-new-experiment-name"
                data-testid="mlflow-new-experiment-name"
                value={newExperimentName}
                onChange={(_e, value) =>
                  onChange({
                    isExperimentTrackingEnabled: true,
                    mode: MlflowExperimentMode.NEW,
                    newExperimentName: value,
                  })
                }
                maxLength={NAME_CHARACTER_LIMIT}
                isDisabled={isDisabled}
                isRequired
              />
              <CharLimitHelperText
                limit={NAME_CHARACTER_LIMIT}
                currentLength={newExperimentName.length}
              />
            </FormGroup>
          )
        }
      />

      <FormGroup
        label="MLflow autologging"
        fieldId="mlflow-autologging"
        labelHelp={
          <DashboardHelpTooltip content="To enable automatic metric tracking, add this code to your training script or notebook." />
        }
      >
        <div style={isDisabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
          <CodeBlock
            actions={
              <CodeBlockAction>
                <ClipboardCopyButton
                  id="mlflow-autolog-copy"
                  aria-label="Copy to clipboard"
                  disabled={isDisabled}
                  onClick={() => {
                    navigator.clipboard
                      .writeText(MLFLOW_AUTOLOG_SNIPPET)
                      .then(() => setCopied(true))
                      .catch(() => undefined);
                  }}
                  exitDelay={copied ? 1500 : 600}
                  variant="plain"
                  onTooltipHidden={() => setCopied(false)}
                >
                  {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
                </ClipboardCopyButton>
              </CodeBlockAction>
            }
          >
            <CodeBlockCode id="mlflow-autolog-code">{MLFLOW_AUTOLOG_SNIPPET}</CodeBlockCode>
          </CodeBlock>
        </div>
      </FormGroup>
    </FormSection>
  );
};

export default MlflowIntegrationSection;

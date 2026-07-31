import React from 'react';
import {
  FormGroup,
  Checkbox,
  Tooltip,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { DSPAMlflowIntegrationMode, DSPipelineMlflowKind } from '#~/k8sTypes';
import FormSection from '#~/components/pf-overrides/FormSection';

type MlflowTrackingSectionBaseProps = {
  mlflow: DSPipelineMlflowKind;
  setMlflow: (mlflow: DSPipelineMlflowKind) => void;
};

type MlflowTrackingSectionProps = MlflowTrackingSectionBaseProps &
  ({ variant?: 'form' } | { variant: 'description' });

const INJECT_DISABLED_TOOLTIP =
  "MLflow integration must be enabled to inject credentials into pipeline tasks. Enable 'Automatically detect and connect to MLflow' first.";

const MlflowTrackingSection: React.FC<MlflowTrackingSectionProps> = ({
  variant = 'form',
  mlflow,
  setMlflow,
}) => {
  const isIntegrationEnabled =
    mlflow.integrationMode === undefined ||
    mlflow.integrationMode === DSPAMlflowIntegrationMode.AUTODETECT;
  const isInjectEnabled = !!mlflow.injectUserEnvVars;

  const integrationCheckbox = (
    <Checkbox
      id="mlflow-integration-mode-checkbox"
      data-testid="mlflow-integration-mode-checkbox"
      name="mlflow-integration-mode-checkbox"
      label="Automatically detect and connect to MLflow"
      isChecked={isIntegrationEnabled}
      onChange={(_e, checked) => {
        setMlflow({
          ...mlflow,
          integrationMode: checked
            ? DSPAMlflowIntegrationMode.AUTODETECT
            : DSPAMlflowIntegrationMode.DISABLED,
          ...(checked ? {} : { injectUserEnvVars: false }),
        });
      }}
      description="When enabled, the pipeline server discovers the MLflow instance on the cluster and logs pipeline run metrics to MLflow experiments. Disable to opt out of MLflow integration entirely."
    />
  );

  const injectCheckboxElement = (
    <Checkbox
      id="mlflow-inject-env-vars-checkbox"
      data-testid="mlflow-inject-env-vars-checkbox"
      name="mlflow-inject-env-vars-checkbox"
      label="Allow pipeline tasks to log directly to MLflow"
      isChecked={isInjectEnabled}
      isDisabled={!isIntegrationEnabled}
      onChange={(_e, checked) => {
        setMlflow({
          ...mlflow,
          injectUserEnvVars: checked,
        });
      }}
      description={
        <span className={!isIntegrationEnabled ? 'pf-v6-u-disabled-color-100' : undefined}>
          When enabled, pipeline tasks receive MLflow credentials automatically, so calls like
          mlflow.autolog() log to the correct MLflow run.
        </span>
      }
    />
  );

  const injectCheckbox = !isIntegrationEnabled ? (
    <Tooltip content={INJECT_DISABLED_TOOLTIP}>
      <span role="button" tabIndex={0} aria-label="Credential injection (disabled)">
        {injectCheckboxElement}
      </span>
    </Tooltip>
  ) : (
    injectCheckboxElement
  );

  if (variant === 'description') {
    return (
      <DescriptionListGroup>
        <DescriptionListTerm>MLflow experiment tracking</DescriptionListTerm>
        <DescriptionListDescription>
          {integrationCheckbox}
          {injectCheckbox}
        </DescriptionListDescription>
      </DescriptionListGroup>
    );
  }

  return (
    <FormSection title="MLflow experiment tracking">
      <FormGroup hasNoPaddingTop isStack>
        {integrationCheckbox}
        {injectCheckbox}
      </FormGroup>
    </FormSection>
  );
};

export default MlflowTrackingSection;

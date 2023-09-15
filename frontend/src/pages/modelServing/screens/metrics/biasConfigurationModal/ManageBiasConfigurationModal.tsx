import * as React from 'react';
import { Form, FormGroup, Modal, TextInput } from '@patternfly/react-core';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { BiasMetricType } from '~/api';
import { InferenceServiceKind } from '~/k8sTypes';
import { ExplainabilityContext } from '~/concepts/explainability/ExplainabilityContext';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import {
  checkConfigurationFieldsValid,
  convertConfigurationRequestType,
  getThresholdDefaultDelta,
} from '~/pages/modelServing/screens/metrics/utils';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import useBiasConfigurationObject from './useBiasConfigurationObject';
import MetricTypeField from './MetricTypeField';

type ManageBiasConfigurationModalProps = {
  existingConfiguration?: BiasMetricConfig;
  isOpen: boolean;
  onClose: (submit: boolean) => void;
  inferenceService: InferenceServiceKind;
};

const ManageBiasConfigurationModal: React.FC<ManageBiasConfigurationModalProps> = ({
  existingConfiguration,
  isOpen,
  onClose,
  inferenceService,
}) => {
  const {
    apiState: { api },
  } = React.useContext(ExplainabilityContext);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [metricType, setMetricType] = React.useState<BiasMetricType>();
  const [configuration, setConfiguration, resetData] = useBiasConfigurationObject(
    inferenceService.metadata.name,
    metricType,
    existingConfiguration,
  );

  React.useEffect(() => {
    setMetricType(existingConfiguration?.metricType);
  }, [existingConfiguration]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setError(undefined);
    setActionInProgress(false);
    resetData();
    setMetricType(undefined);
  };

  const onCreateConfiguration = () => {
    const createFunc =
      metricType === BiasMetricType.SPD ? api.createSpdRequest : api.createDirRequest;
    setActionInProgress(true);
    createFunc({}, convertConfigurationRequestType(configuration))
      .then(() => onBeforeClose(true))
      .catch((e) => {
        setError(e);
        setActionInProgress(false);
      });
  };

  return (
    <Modal
      variant="medium"
      title="Configure bias metric"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      footer={
        <DashboardModalFooter
          error={error}
          onCancel={() => onBeforeClose(false)}
          onSubmit={onCreateConfiguration}
          submitLabel="Configure"
          alertTitle="Failed to configure bias metric"
          isSubmitDisabled={
            !checkConfigurationFieldsValid(configuration, metricType) || actionInProgress
          }
        />
      }
      description="All fields are required."
    >
      <Form>
        <FormGroup
          label="Metric name"
          fieldId="metric-name"
          helperText="This is the name that will be used to select the metric for monitoring."
        >
          <TextInput
            id="metric-name"
            value={configuration.requestName}
            onChange={(value) => setConfiguration('requestName', value)}
          />
        </FormGroup>
        <MetricTypeField
          fieldId="metric-type"
          value={metricType}
          onChange={(value) => {
            setMetricType(value);
            setConfiguration('thresholdDelta', getThresholdDefaultDelta(value));
          }}
        />
        <FormGroup
          label="Protected attribute"
          fieldId="protected-attribute"
          labelIcon={
            <DashboardHelpTooltip content="The protected attribute is the input feature that you want to investigate bias over." />
          }
        >
          <TextInput
            id="protected-attribute"
            value={configuration.protectedAttribute}
            onChange={(value) => setConfiguration('protectedAttribute', value)}
          />
        </FormGroup>
        <FormGroup
          label="Privileged value"
          fieldId="privileged-value"
          labelIcon={
            <DashboardHelpTooltip content="The privileged value is the value of the protected attribute that the model might be biased towards." />
          }
        >
          <TextInput
            id="privileged-value"
            value={configuration.privilegedAttribute}
            onChange={(value) => setConfiguration('privilegedAttribute', value)}
          />
        </FormGroup>
        <FormGroup
          label="Unprivileged value"
          fieldId="unprivileged-value"
          labelIcon={
            <DashboardHelpTooltip content="The unprivileged value is the value of the protected attribute that the model might be biased against." />
          }
        >
          <TextInput
            id="unprivileged-value"
            value={configuration.unprivilegedAttribute}
            onChange={(value) => setConfiguration('unprivilegedAttribute', value)}
          />
        </FormGroup>
        <FormGroup
          label="Output"
          fieldId="output"
          labelIcon={
            <DashboardHelpTooltip content="The output is the particular output of the model to monitor for bias." />
          }
        >
          <TextInput
            id="output"
            value={configuration.outcomeName}
            onChange={(value) => setConfiguration('outcomeName', value)}
          />
        </FormGroup>
        <FormGroup
          label="Output value"
          fieldId="output-value"
          labelIcon={
            <DashboardHelpTooltip content="The output value is the value of the chosen output to monitor for bias." />
          }
        >
          <TextInput
            id="output-value"
            value={configuration.favorableOutcome}
            onChange={(value) => setConfiguration('favorableOutcome', value)}
          />
        </FormGroup>
        <FormGroup
          label="Violation threshold"
          fieldId="violation-threshold"
          labelIcon={
            <DashboardHelpTooltip content='The violation threshold is how far the metric value can be from "perfect fairness" to constitute "unfairness".' />
          }
        >
          <TextInput
            id="violation-threshold"
            value={configuration.thresholdDelta}
            type="number"
            onChange={(value) => setConfiguration('thresholdDelta', Number(value))}
          />
        </FormGroup>
        <FormGroup
          label="Metric batch size"
          fieldId="metric-batch-size"
          labelIcon={
            <DashboardHelpTooltip content="The metric batch size is how many of the previous model inferences to consider in each metric calculation." />
          }
        >
          <TextInput
            id="metric-batch-size"
            value={configuration.batchSize}
            type="number"
            onChange={(value) => setConfiguration('batchSize', Number(value))}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ManageBiasConfigurationModal;

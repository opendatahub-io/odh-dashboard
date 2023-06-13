import * as React from 'react';
import { Form, FormGroup, Modal, TextInput, Tooltip } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { MetricTypes } from '~/api';
import { InferenceServiceKind } from '~/k8sTypes';
import { ExplainabilityContext } from '~/concepts/explainability/ExplainabilityContext';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import {
  checkConfigurationFieldsValid,
  convertConfigurationRequestType,
} from '~/pages/modelServing/screens/metrics/utils';
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
  const [configuration, setConfiguration] = useBiasConfigurationObject(
    inferenceService.metadata.name,
    existingConfiguration,
  );
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [metricType, setMetricType] = React.useState<MetricTypes>();

  React.useEffect(() => {
    setMetricType(existingConfiguration?.metricType);
  }, [existingConfiguration]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setError(undefined);
    setActionInProgress(false);
  };

  const onCreateConfiguration = () => {
    const createFunc = metricType === MetricTypes.SPD ? api.createSpdRequest : api.createDirRequest;
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
        <MetricTypeField fieldId="metric-type" value={metricType} setValue={setMetricType} />
        <FormGroup label="Protected attribute" fieldId="protected-attribute">
          <TextInput
            id="protected-attribute"
            value={configuration.protectedAttribute}
            onChange={(value) => setConfiguration('protectedAttribute', value)}
          />
        </FormGroup>
        <FormGroup label="Privileged value" fieldId="privileged-value">
          <TextInput
            id="privileged-value"
            value={configuration.privilegedAttribute}
            onChange={(value) => setConfiguration('privilegedAttribute', value)}
          />
        </FormGroup>
        <FormGroup label="Unprivileged value" fieldId="unprivileged-value">
          <TextInput
            id="unprivileged-value"
            value={configuration.unprivilegedAttribute}
            onChange={(value) => setConfiguration('unprivilegedAttribute', value)}
          />
        </FormGroup>
        <FormGroup label="Output" fieldId="output">
          <TextInput
            id="output"
            value={configuration.outcomeName}
            onChange={(value) => setConfiguration('outcomeName', value)}
          />
        </FormGroup>
        <FormGroup label="Output value" fieldId="output-value">
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
            <Tooltip content="TBD">
              <HelpIcon />
            </Tooltip>
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
            <Tooltip content="TBD">
              <HelpIcon />
            </Tooltip>
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

import * as React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { BiasMetricConfig } from '~/concepts/trustyai/types';
import { BiasMetricType } from '~/api';
import { InferenceServiceKind } from '~/k8sTypes';
import { TrustyAIContext } from '~/concepts/trustyai/context/TrustyAIContext';
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
  onClose: (submit: boolean) => void;
  inferenceService: InferenceServiceKind;
};

const ManageBiasConfigurationModal: React.FC<ManageBiasConfigurationModalProps> = ({
  existingConfiguration,
  onClose,
  inferenceService,
}) => {
  const {
    apiState: { api },
  } = React.useContext(TrustyAIContext);
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
    <Modal variant="medium" isOpen onClose={() => onBeforeClose(false)}>
      <ModalHeader title="Configure bias metric" description="All fields are required." />
      <ModalBody>
        <Form>
          <FormGroup label="Metric name" fieldId="metric-name" data-testid="metric-name">
            <TextInput
              data-testid="metric-name-input"
              id="metric-name"
              value={configuration.requestName}
              onChange={(e, value) => setConfiguration('requestName', value)}
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
            labelHelp={
              <DashboardHelpTooltip content="The protected attribute is the input feature that you want to investigate bias over." />
            }
          >
            <TextInput
              id="protected-attribute"
              data-testid="protected-attribute"
              value={configuration.protectedAttribute}
              onChange={(e, value) => setConfiguration('protectedAttribute', value)}
            />
          </FormGroup>
          <FormGroup
            label="Privileged value"
            fieldId="privileged-value"
            labelHelp={
              <DashboardHelpTooltip content="The privileged value is the value of the protected attribute that the model might be biased towards." />
            }
          >
            <TextInput
              id="privileged-value"
              data-testid="privileged-value"
              value={String(configuration.privilegedAttribute)}
              onChange={(e, value) => setConfiguration('privilegedAttribute', value)}
            />
          </FormGroup>
          <FormGroup
            label="Unprivileged value"
            fieldId="unprivileged-value"
            labelHelp={
              <DashboardHelpTooltip content="The unprivileged value is the value of the protected attribute that the model might be biased against." />
            }
          >
            <TextInput
              id="unprivileged-value"
              data-testid="unprivileged-value"
              value={String(configuration.unprivilegedAttribute)}
              onChange={(e, value) => setConfiguration('unprivilegedAttribute', value)}
            />
          </FormGroup>
          <FormGroup
            label="Output"
            fieldId="output"
            labelHelp={
              <DashboardHelpTooltip content="The output is the particular output of the model to monitor for bias." />
            }
          >
            <TextInput
              id="output"
              data-testid="output"
              value={configuration.outcomeName}
              onChange={(e, value) => setConfiguration('outcomeName', value)}
            />
          </FormGroup>
          <FormGroup
            label="Output value"
            fieldId="output-value"
            labelHelp={
              <DashboardHelpTooltip content="The output value is the value of the chosen output to monitor for bias." />
            }
          >
            <TextInput
              id="output-value"
              data-testid="output-value"
              value={String(configuration.favorableOutcome)}
              onChange={(e, value) => setConfiguration('favorableOutcome', value)}
            />
          </FormGroup>
          <FormGroup
            label="Violation threshold"
            fieldId="violation-threshold"
            labelHelp={
              <DashboardHelpTooltip content='The violation threshold is how far the metric value can be from "perfect fairness" to constitute "unfairness".' />
            }
          >
            <TextInput
              id="violation-threshold"
              data-testid="violation-threshold"
              value={configuration.thresholdDelta}
              type="number"
              onChange={(e, value) => setConfiguration('thresholdDelta', Number(value))}
            />
          </FormGroup>
          <FormGroup
            label="Metric batch size"
            fieldId="metric-batch-size"
            labelHelp={
              <DashboardHelpTooltip content="The metric batch size is how many of the previous model inferences to consider in each metric calculation." />
            }
          >
            <TextInput
              id="metric-batch-size"
              data-testid="metric-batch-size"
              value={configuration.batchSize}
              type="number"
              onChange={(e, value) => setConfiguration('batchSize', Number(value))}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
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
      </ModalFooter>
    </Modal>
  );
};

export default ManageBiasConfigurationModal;

import {
  Button,
  Content,
  Flex,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
} from '@patternfly/react-core';
import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import {
  DEFAULT_EVAL_METRIC_BY_TASK,
  EVAL_METRIC_DESCRIPTIONS,
  EVAL_METRICS_BY_TASK_TYPE,
  type EvalMetric,
} from '~/app/utilities/const';
import { formatMetricName } from '~/app/utilities/utils';
import './AutomlConfigure.scss';

type OptimizationMetricModalProps = {
  isOpen: boolean;
  onSave: (metric: EvalMetric) => void;
  onCancel: () => void;
};

const OptimizationMetricModal: React.FC<OptimizationMetricModalProps> = ({
  isOpen,
  onSave,
  onCancel,
}) => {
  const { control } = useFormContext<ConfigureSchema>();
  const [taskType, currentMetric] = useWatch({ control, name: ['task_type', 'eval_metric'] });

  const defaultMetric = DEFAULT_EVAL_METRIC_BY_TASK[taskType];
  const metrics = EVAL_METRICS_BY_TASK_TYPE[taskType] ?? [];
  const resolvedMetric = currentMetric ?? defaultMetric;

  const [selectedMetric, setSelectedMetric] = useState<EvalMetric | undefined>(resolvedMetric);

  useEffect(() => {
    if (isOpen) {
      setSelectedMetric(resolvedMetric);
    }
  }, [isOpen, resolvedMetric]);

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onCancel}
      className="automl-optimization-metric-modal"
      data-testid="optimization-metric-modal"
    >
      <ModalHeader title="Select optimization metric" />
      <ModalBody>
        <Content component="p" className="pf-v6-u-mb-md">
          Choose the metric to optimize when comparing models. AutoML will rank models based on this
          metric.
        </Content>
        <div className="automl-optimization-metric-modal__radio-list">
          <Flex direction={{ default: 'column' }}>
            {metrics.map((metric) => (
              <Radio
                key={metric}
                id={`eval-metric-${metric}`}
                name="eval_metric"
                label={formatMetricName(metric)}
                description={EVAL_METRIC_DESCRIPTIONS[metric]}
                isChecked={selectedMetric === metric}
                onChange={() => setSelectedMetric(metric)}
                data-testid={`eval-metric-radio-${metric}`}
              />
            ))}
          </Flex>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => {
            if (selectedMetric) {
              onSave(selectedMetric);
            }
          }}
          isDisabled={!selectedMetric}
          data-testid="optimization-metric-save"
        >
          Save
        </Button>
        <Button variant="link" onClick={onCancel} data-testid="optimization-metric-cancel">
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OptimizationMetricModal;

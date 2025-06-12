import * as React from 'react';
import { Spinner, EmptyStateVariant, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import {
  InputDefinitionParameterType,
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineSpecVariable,
} from '#~/concepts/pipelines/kfTypes';
import {
  DetailItem,
  renderDetailItems,
} from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { ExecutionDetailsPropertiesValueCode } from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsPropertiesValue';
import { NoValue } from '#~/components/NoValue';

type PipelineRunTabParametersProps = {
  run: PipelineRecurringRunKF | PipelineRunKF | null;
  pipelineSpec: PipelineSpecVariable | undefined;
};

const PipelineRunTabParameters: React.FC<PipelineRunTabParametersProps> = ({
  run,
  pipelineSpec,
}) => {
  if (!run) {
    return (
      <EmptyState
        titleText="Loading"
        headingLevel="h4"
        variant={EmptyStateVariant.lg}
        data-id="loading-empty-state"
      >
        <Spinner size="xl" />
      </EmptyState>
    );
  }

  const specParameters =
    pipelineSpec?.root?.inputDefinitions?.parameters ||
    pipelineSpec?.pipeline_spec?.root.inputDefinitions?.parameters;

  const parameters = run.runtime_config?.parameters
    ? Object.entries(run.runtime_config.parameters)
    : [];

  if (parameters.length === 0) {
    return (
      <EmptyState
        titleText="No parameters"
        headingLevel="h2"
        variant={EmptyStateVariant.lg}
        data-id="parameters-empty-state"
      >
        <EmptyStateBody>This pipeline run does not have any parameters defined.</EmptyStateBody>
      </EmptyState>
    );
  }

  const details: DetailItem[] = parameters.map(([key, initialValue]) => {
    let value: React.ReactNode;
    const paramType = specParameters?.[key].parameterType;
    switch (paramType) {
      case InputDefinitionParameterType.DOUBLE:
        value = Number.isInteger(Number(initialValue))
          ? Number(initialValue).toFixed(1)
          : Number(initialValue);
        break;
      case InputDefinitionParameterType.INTEGER:
        value = Number(initialValue);
        break;
      case InputDefinitionParameterType.BOOLEAN:
        value = initialValue ? 'True' : 'False';
        break;
      case InputDefinitionParameterType.STRING:
        try {
          const jsonStringValue = JSON.parse(String(initialValue));
          if (parseFloat(jsonStringValue)) {
            throw initialValue;
          }
          value = (
            <ExecutionDetailsPropertiesValueCode code={JSON.stringify(jsonStringValue, null, 2)} />
          );
        } catch {
          value = String(initialValue) || <NoValue />;
        }
        break;
      case InputDefinitionParameterType.LIST:
        value = (
          <ExecutionDetailsPropertiesValueCode code={JSON.stringify(initialValue, null, 2)} />
        );
        break;
      case InputDefinitionParameterType.STRUCT:
        value = (
          <ExecutionDetailsPropertiesValueCode code={JSON.stringify(initialValue, null, 2)} />
        );
        break;
      default:
        value = JSON.stringify(initialValue);
    }
    return {
      key,
      value,
    };
  });

  return <>{renderDetailItems(details)}</>;
};

export default PipelineRunTabParameters;

import React from 'react';

import { Grid, GridItem, Stack, StackItem } from '@patternfly/react-core';
import { Value as ProtoValue } from 'google-protobuf/google/protobuf/struct_pb';

import { Link } from 'react-router-dom';
import { Execution } from '~/third_party/mlmd';
import TaskDetailsInputOutput from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputOutput';
import { PipelineTask, PipelineTaskParam } from '~/concepts/pipelines/topology';
import { ExecutionDetailsPropertiesValueCode } from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsPropertiesValue';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import { NoValue } from '~/components/NoValue';
import { executionDetailsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

type SelectedNodeInputOutputTabProps = {
  task: PipelineTask;
  execution: Execution.AsObject | undefined;
};

const SelectedNodeInputOutputTab: React.FC<SelectedNodeInputOutputTabProps> = ({
  task,
  execution,
}) => {
  const { namespace } = usePipelinesAPI();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  const executionDisplayName = React.useMemo(
    () =>
      execution?.customPropertiesMap.find(
        ([customPropKey]) => customPropKey === 'display_name',
      )?.[1].stringValue || '(No name)',
    [execution?.customPropertiesMap],
  );

  const getExecutionFieldsMap = React.useCallback(
    (key: string) =>
      execution?.customPropertiesMap.find(([customPropKey]) => customPropKey === key)?.[1]
        .structValue?.fieldsMap || [],
    [execution?.customPropertiesMap],
  );

  const getExecutionValueFromInputType = React.useCallback(
    (executionValues: ProtoValue.AsObject | undefined, type: InputDefinitionParameterType) => {
      const { numberValue, boolValue, stringValue, listValue, structValue, nullValue } =
        executionValues || {};

      switch (type) {
        case InputDefinitionParameterType.DOUBLE:
          return numberValue && Number.isInteger(numberValue)
            ? numberValue.toFixed(1)
            : numberValue;
        case InputDefinitionParameterType.INTEGER:
          return numberValue;
        case InputDefinitionParameterType.BOOLEAN:
          return boolValue ? 'True' : 'False';
        case InputDefinitionParameterType.STRING:
          try {
            const jsonStringValue = JSON.parse(stringValue ?? '');

            if (parseFloat(jsonStringValue)) {
              throw stringValue;
            }

            return (
              <ExecutionDetailsPropertiesValueCode
                code={JSON.stringify(jsonStringValue, null, 2)}
              />
            );
          } catch {
            return stringValue || <NoValue />;
          }
          break;
        case InputDefinitionParameterType.LIST:
          return <ExecutionDetailsPropertiesValueCode code={JSON.stringify(listValue, null, 2)} />;
        case InputDefinitionParameterType.STRUCT:
          return (
            <ExecutionDetailsPropertiesValueCode code={JSON.stringify(structValue, null, 2)} />
          );
        default:
          return nullValue;
      }
    },
    [],
  );

  const getParams = React.useCallback(
    (
      params: PipelineTaskParam[] | undefined,
      executionParamMapList: [string, ProtoValue.AsObject][],
    ) =>
      params?.map((taskParam) => {
        const { label, value, type } = taskParam;
        const executionParamMap = executionParamMapList.find(
          ([executionInputKey]) => taskParam.label === executionInputKey,
        );
        const { 1: executionParamValues } = executionParamMap || [];
        const executionValue = getExecutionValueFromInputType(executionParamValues, type);

        return {
          label,
          value: executionValue || value || type,
        };
      }),
    [getExecutionValueFromInputType],
  );

  return (
    <Stack hasGutter>
      {isExperimentsAvailable && execution?.id && (
        <StackItem data-testid="execution-name">
          <Grid hasGutter>
            <GridItem span={6}>
              <b>Execution name</b>
            </GridItem>
            <GridItem span={6}>
              <Link to={executionDetailsRoute(namespace, execution.id.toString())}>
                {executionDisplayName}
              </Link>
            </GridItem>
          </Grid>
        </StackItem>
      )}
      {task.inputs && (
        <StackItem>
          <TaskDetailsInputOutput
            type="Input"
            artifacts={task.inputs.artifacts}
            params={getParams(task.inputs.params, getExecutionFieldsMap('inputs'))}
          />
        </StackItem>
      )}
      {task.outputs && (
        <StackItem>
          <TaskDetailsInputOutput
            type="Output"
            artifacts={task.outputs.artifacts}
            params={getParams(task.outputs.params, getExecutionFieldsMap('outputs'))}
          />
        </StackItem>
      )}
    </Stack>
  );
};
export default SelectedNodeInputOutputTab;

import React from 'react';

import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Value as ProtoValue } from 'google-protobuf/google/protobuf/struct_pb';

import { Link } from 'react-router-dom';
import { Execution } from '~/third_party/mlmd';
import TaskDetailsInputOutput from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputOutput';
import { PipelineTask, PipelineTaskParam } from '~/concepts/pipelines/topology';
import { ExecutionDetailsPropertiesValueCode } from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsPropertiesValue';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import { NoValue } from '~/components/NoValue';
import { executionDetailsRoute } from '~/routes/pipelines/executions';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type SelectedNodeInputOutputTabProps = {
  task: PipelineTask;
  execution: Execution.AsObject | undefined;
};

const SelectedNodeInputOutputTab: React.FC<SelectedNodeInputOutputTabProps> = ({
  task,
  execution,
}) => {
  const { namespace } = usePipelinesAPI();

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
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXl' }}>
      {execution?.id && (
        <FlexItem data-testid="execution-name">
          <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '16ch' }}>
            <DescriptionListGroup>
              <DescriptionListTerm>Execution name</DescriptionListTerm>
              <DescriptionListDescription>
                <Link to={executionDetailsRoute(namespace, execution.id.toString())}>
                  {executionDisplayName}
                </Link>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </FlexItem>
      )}
      {task.inputs && (
        <FlexItem>
          <TaskDetailsInputOutput
            type="Input"
            artifacts={task.inputs.artifacts}
            params={getParams(task.inputs.params, getExecutionFieldsMap('inputs'))}
          />
        </FlexItem>
      )}
      {task.outputs && (
        <FlexItem>
          <TaskDetailsInputOutput
            type="Output"
            artifacts={task.outputs.artifacts}
            params={getParams(task.outputs.params, getExecutionFieldsMap('outputs'))}
          />
        </FlexItem>
      )}
    </Flex>
  );
};
export default SelectedNodeInputOutputTab;

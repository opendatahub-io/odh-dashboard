import React, { useRef, useState } from 'react';
import {
  Button,
  List,
  ListItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, Caption } from '@patternfly/react-table';

type TestHookProps<T extends unknown[]> = {
  hook: (...args: T) => unknown;
  defaultHookParams: T;
  hookParams: T[];
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TestHook = <T extends any[]>({
  hook,
  defaultHookParams,
  hookParams = [],
}: TestHookProps<T>) => {
  const [selectedParam, setSelectedParam] = useState<T>(defaultHookParams);

  // call hook
  const hookResult = hook(...selectedParam);

  // convert unknown hook response to unknown[]
  const hookResultArray: unknown[] = [];
  if (typeof hookResult === 'object') {
    hookResultArray.push(...Object.values(hookResult ?? {}));
  } else {
    hookResultArray.push(hookResult);
  }

  const previousPropsRef = useRef(defaultHookParams);
  const propStatusesRef = useRef<string[]>([]);

  const previousResultArrayRef = useRef(hookResultArray);
  const resultArrayStatusesRef = useRef<string[]>([]);

  const previousResultRef = useRef(hookResult);
  const resultStatusRef = useRef<string>('');

  // get prop stability
  defaultHookParams.forEach((prop, index) => {
    const isStable = previousPropsRef.current[index] === prop;
    propStatusesRef.current[index] = isStable ? 'stable' : 'unstable';
  });
  previousPropsRef.current = defaultHookParams;

  // get whole result stability
  const isStable = previousResultRef.current === hookResult;
  resultStatusRef.current = isStable ? 'stable' : 'unstable';
  previousResultRef.current = hookResult;

  // get individual result stability
  hookResultArray.forEach((prop, index) => {
    const isStable = previousResultArrayRef.current[index] === prop;
    resultArrayStatusesRef.current[index] = isStable ? 'stable' : 'unstable';
  });
  previousResultArrayRef.current = hookResultArray;

  const getType = (value: unknown) => {
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return 'array';
      }
      return 'object';
    }
    return typeof value;
  };

  const isPrimitive = (value: unknown) => value !== Object(value);

  const renderTable = (
    statusRef: string[],
    dataArray: unknown[],
    dataIdPrefix: string,
    showButtons = false,
  ) => (
    <Table variant="compact">
      <Thead>
        <Tr>
          <Th>Type</Th>
          <Th>Value</Th>
          <Th>Status</Th>
          <Th />
        </Tr>
      </Thead>
      <Tbody>
        {dataArray.map((value, index) => (
          <Tr key={`table-row-${dataIdPrefix}-${index}`}>
            <Td dataLabel="type" data-testid={`${dataIdPrefix}-type-${index}`}>
              {getType(value)}
            </Td>
            <Td width={70} dataLabel="value" data-testid={`${dataIdPrefix}-value-${index}`}>
              {typeof value === 'function' ? String(value) : JSON.stringify(value)}
            </Td>
            <Td dataLabel="status" data-testid={`${dataIdPrefix}-status-${index}`}>
              <span style={{ color: statusRef[index] === 'stable' ? 'green' : 'red' }}>
                {!isPrimitive(value) && statusRef[index]}
              </span>
            </Td>
            <Td isActionCell>
              {showButtons && typeof value === 'function' && (
                <Button
                  size="sm"
                  data-testid={`call-function-${index}`}
                  variant="secondary"
                  onClick={() => value()}
                >
                  Call function
                </Button>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel={'h3'}>Select Parameter Set</Title>
        <Split hasGutter>
          <SplitItem>
            <Button
              variant="secondary"
              data-testid="params-default"
              onClick={() => {
                setSelectedParam(defaultHookParams);
              }}
            >
              params-default
            </Button>
          </SplitItem>
          {hookParams.map((_hookParam, index) => (
            <SplitItem key={`button-select-${index}`}>
              <Button
                variant="secondary"
                key={`params-${index}`}
                data-testid={`params-${index}`}
                onClick={() => {
                  setSelectedParam(hookParams[index]);
                }}
              >{`params-${index}`}</Button>
            </SplitItem>
          ))}
        </Split>
      </StackItem>
      <StackItem>
        <Title headingLevel={'h3'}>Selected Parameters</Title>
        {renderTable(propStatusesRef.current, selectedParam, 'param')}
      </StackItem>
      <StackItem>
        <Title headingLevel={'h3'}>Result</Title>
        <Caption>
          <Split hasGutter>
            <SplitItem>
              <span style={{ color: 'grey' }} data-testid="result-all-type">
                {getType(hookResult)}
              </span>
            </SplitItem>
            <SplitItem>
              <span style={{ color: 'grey' }} data-testid="result-all-status">
                {resultStatusRef.current}
              </span>
            </SplitItem>
          </Split>
        </Caption>
        {renderTable(resultArrayStatusesRef.current, hookResultArray, 'result', true)}
      </StackItem>
      <StackItem>
        <Title headingLevel={'h4'}>data-testid key</Title>
        <List>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=params-default</span> - default parameters
            select button
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=params-[index]</span> - select parameters
            button
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=result-all-type</span> - type of non
            destructured result
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=result-all-status</span> - status of non
            destructured result
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=call-function-[index]</span> - call function
            button
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=param-type-[index]</span> - type of
            parameter
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=param-value-[index]</span> - value of
            parameter
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=param-status-[index]</span> - status of
            parameter
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=result-type-[index]</span> - type of result
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=result-value-[index]</span> - value of
            result
          </ListItem>
          <ListItem>
            <span style={{ color: 'grey' }}>data-testid=result-status-[index]</span> - status of
            result
          </ListItem>
        </List>
      </StackItem>
    </Stack>
  );
};

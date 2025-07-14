import React from 'react';

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BrowserRouter } from 'react-router-dom';
import SelectedNodeInputOutputTab from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeInputOutputTab';
import { InputDefinitionParameterType } from '#~/concepts/pipelines/kfTypes';
import { Execution } from '#~/third_party/mlmd';

jest.mock('#~/components/MaxHeightCodeEditor', () => ({
  MaxHeightCodeEditor: ({ code }: { code: string }) => JSON.stringify(JSON.parse(code)),
}));

jest.mock('#~/concepts/areas/useIsAreaAvailable', () => () => ({
  status: true,
  featureFlags: {},
  reliantAreas: {},
  requiredComponents: {},
  requiredCapabilities: {},
  customCondition: jest.fn(),
}));

describe('SelectedNodeInputOutputTab', () => {
  it('renders execution name', async () => {
    render(
      <BrowserRouter>
        <SelectedNodeInputOutputTab
          task={{
            type: 'groupTask',
            name: 'task-1',
            inputs: {
              params: [],
            },
          }}
          execution={
            {
              id: 1,
              customPropertiesMap: [
                [
                  'display_name',
                  {
                    stringValue: 'task-1',
                  },
                  'inputs',
                  {
                    structValue: {
                      fieldsMap: [],
                    },
                  },
                ],
              ],
            } as unknown as Execution.AsObject
          }
        />
      </BrowserRouter>,
    );
    expect(screen.getByText('task-1')).toBeVisible();
  });

  it('renders execution values for input parameters', async () => {
    render(
      <SelectedNodeInputOutputTab
        task={{
          type: 'groupTask',
          name: 'task-1',
          inputs: {
            params: taskParams,
          },
        }}
        execution={
          {
            customPropertiesMap: [
              [
                'inputs',
                {
                  structValue: {
                    fieldsMap: executionFieldsMap,
                  },
                },
              ],
            ],
          } as unknown as Execution.AsObject
        }
      />,
    );

    expect(screen.getByText('Some string')).toBeVisible();
    expect(screen.getByText('No value')).toBeVisible();
    expect(screen.getByText('{"some":"stringObject"}')).toBeVisible();
    expect(screen.getByText('1')).toBeVisible();
    expect(screen.getByText('12.15')).toBeVisible();
    expect(screen.getByText('True')).toBeVisible();
    expect(screen.getByText('{"some":"object"}')).toBeVisible();
    expect(screen.getByText('[{"list":"item-1"},{"list":"item-2"}]')).toBeVisible();
  });

  it('renders execution values for output parameters', async () => {
    render(
      <SelectedNodeInputOutputTab
        task={{
          type: 'groupTask',
          name: 'task-1',
          outputs: {
            params: taskParams,
          },
        }}
        execution={
          {
            customPropertiesMap: [
              [
                'outputs',
                {
                  structValue: {
                    fieldsMap: executionFieldsMap,
                  },
                },
              ],
            ],
          } as unknown as Execution.AsObject
        }
      />,
    );

    expect(screen.getByText('Some string')).toBeVisible();
    expect(screen.getByText('No value')).toBeVisible();
    expect(screen.getByText('{"some":"stringObject"}')).toBeVisible();
    expect(screen.getByText('1')).toBeVisible();
    expect(screen.getByText('12.15')).toBeVisible();
    expect(screen.getByText('True')).toBeVisible();
    expect(screen.getByText('{"some":"object"}')).toBeVisible();
    expect(screen.getByText('[{"list":"item-1"},{"list":"item-2"}]')).toBeVisible();
  });
});

const taskParams = [
  { label: 'param-string-1', type: InputDefinitionParameterType.STRING },
  { label: 'param-string-2', type: InputDefinitionParameterType.STRING },
  { label: 'param-string-3', type: InputDefinitionParameterType.STRING },
  { label: 'param-string-4', type: InputDefinitionParameterType.STRING },
  { label: 'param-int', type: InputDefinitionParameterType.INTEGER },
  { label: 'param-double', type: InputDefinitionParameterType.DOUBLE },
  { label: 'param-bool', type: InputDefinitionParameterType.BOOLEAN },
  { label: 'param-struct', type: InputDefinitionParameterType.STRUCT },
  { label: 'param-list', type: InputDefinitionParameterType.LIST },
];

const executionFieldsMap = [
  ['param-string-1', { stringValue: 'Some string' }],
  ['param-string-2', { stringValue: '' }],
  ['param-string-3', { stringValue: '10.10' }],
  ['param-string-4', { stringValue: '{"some":"stringObject"}' }],
  ['param-int', { numberValue: 1 }],
  ['param-double', { numberValue: 12.15 }],
  ['param-bool', { boolValue: true }],
  [
    'param-struct',
    {
      structValue: { some: 'object' },
    },
  ],
  [
    'param-list',
    {
      listValue: [{ list: 'item-1' }, { list: 'item-2' }],
    },
  ],
];

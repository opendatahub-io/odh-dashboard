import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ManageConnectionModal } from '~/pages/projects/screens/detail/connections/ManageConnectionsModal';
import { mockConnectionTypeConfigMapObj } from '~/__mocks__/mockConnectionType';
import { mockProjectK8sResource } from '~/__mocks__';
import { mockConnection } from '~/__mocks__/mockConnection';

describe('Create connection modal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn().mockResolvedValue(() => undefined);

  it('should preselect connection type if only one', async () => {
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'Short text',
                envVar: 'env',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('combobox')).toHaveValue('the only type');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Short text' })).toBeVisible();
  });

  it('should list connection types and select one', async () => {
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'type one',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 1',
                envVar: 'env1',
                properties: {},
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type two',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 2',
                envVar: 'env2',
                properties: {},
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type three disabled',
            enabled: false,
            fields: [
              {
                type: 'short-text',
                name: 'Short text 2',
                envVar: 'env2',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    expect(screen.getByRole('option', { name: /type one/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /type two/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /type three disabled/ })).toBeFalsy();

    await act(async () => {
      screen.getByRole('option', { name: /type one/ }).click();
    });
    expect(screen.getByRole('combobox')).toHaveValue('type one');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toBeVisible();
  });

  it('should enable create button when required fields filled and all valid', async () => {
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                required: true,
                properties: {},
              },
              {
                type: 'text',
                name: 'text 2',
                envVar: 'env2',
                required: true,
                properties: {},
              },
              {
                type: 'boolean',
                name: 'boolean 3',
                envVar: 'env3',
                required: true,
                properties: {},
              },
              {
                type: 'dropdown',
                name: 'dropdown 4',
                envVar: 'env4',
                required: true,
                properties: {
                  items: [{ label: 'a', value: 'a' }],
                },
              },
            ],
          }),
        ]}
      />,
    );

    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'a' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'short text 1' }), {
        target: { value: 'b' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'text 2' }), {
        target: { value: 'c' },
      });
      screen.getByRole('button', { name: 'dropdown 4' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /Value: a/ }).click();
    });

    expect(createButton).toBeEnabled();
    await act(async () => {
      createButton.click();
    });
    expect(onSubmitMock).toBeCalled();
  });

  it('should enable create once field validations are valid', async () => {
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env',
                properties: {},
              },
              {
                type: 'uri',
                name: 'uri 2',
                envVar: 'env2',
                properties: {},
              },
              {
                type: 'numeric',
                name: 'numeric 3',
                envVar: 'env3',
                properties: { min: 0 },
              },
            ],
          }),
        ]}
      />,
    );

    const connectionName = screen.getByRole('textbox', { name: 'Connection name' });
    const uri = screen.getByRole('textbox', { name: 'uri 2' });
    const numeric = screen.getByRole('spinbutton', { name: 'Input' });
    const createButton = screen.getByRole('button', { name: 'Create' });

    // should be enabled / valid when validations fields are blank
    await act(async () => {
      fireEvent.change(connectionName, {
        target: { value: 'name entry' },
      });
    });
    expect(createButton).toBeEnabled();

    // uri
    await act(async () => {
      fireEvent.change(uri, {
        target: { value: 'invalid uri' },
      });
      fireEvent.blur(uri);
    });
    expect(createButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(uri, {
        target: { value: 'http://localhost' },
      });
      fireEvent.blur(uri);
    });
    expect(createButton).toBeEnabled();

    // numeric
    await act(async () => {
      fireEvent.change(numeric, {
        target: { value: '-10' },
      });
    });
    expect(createButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(numeric, {
        target: { value: '2' },
      });
    });
    expect(createButton).toBeEnabled();

    await act(async () => {
      createButton.click();
    });
    expect(onSubmitMock).toBeCalled();
  });

  it('should clear or restore values when switching types', async () => {
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'type one',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 1',
                envVar: 'env1',
                properties: {},
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type two',
            fields: [
              {
                type: 'short-text',
                name: 'Short text 2',
                envVar: 'env2',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /type one/ }).click();
    });
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'connection one name' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection description' }), {
        target: { value: 'connection one desc' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Short text 1' }), {
        target: { value: 'one field' },
      });
    });
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toHaveValue('one field');

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /type two/ }).click();
    });
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 2' })).toHaveValue('');

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /type one/ }).click();
    });
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toHaveValue('one field');
  });
});

describe('Edit connection modal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn().mockResolvedValue(() => undefined);

  it('should load existing connection', async () => {
    render(
      <ManageConnectionModal
        isEdit
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connection={mockConnection({
          name: 's3-connection',
          description: 's3 desc',
          connectionType: 's3',
          data: {
            env1: window.btoa('saved data'),
            env2: window.btoa('3'),
            env3: window.btoa('true'),
            env4: window.btoa('a'),
            env5: window.btoa('["a","b"]'),
          },
        })}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 's3',
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env1',
                properties: {},
              },
              {
                type: 'numeric',
                name: 'numeric 2',
                envVar: 'env2',
                properties: {},
              },
              {
                type: 'boolean',
                name: 'boolean 3',
                envVar: 'env3',
                properties: {},
              },
              {
                type: 'dropdown',
                name: 'dropdown 4',
                envVar: 'env4',
                properties: {
                  items: [
                    { label: 'a', value: 'a' },
                    { label: 'b', value: 'b' },
                  ],
                },
              },
              {
                type: 'dropdown',
                name: 'dropdown 5 multi',
                envVar: 'env5',
                properties: {
                  variant: 'multi',
                  items: [
                    { label: 'a', value: 'a' },
                    { label: 'b', value: 'b' },
                  ],
                },
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'postgres',
            fields: [
              {
                type: 'short-text',
                name: 'Short text',
                envVar: 'env1',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('combobox')).toHaveValue('s3');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue('s3-connection');
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue('s3 desc');
    expect(screen.getByRole('textbox', { name: 'short text 1' })).toHaveValue('saved data');
    expect(screen.getByRole('spinbutton', { name: 'Input' })).toHaveValue(3);
    expect(screen.getByRole('checkbox', { name: 'boolean 3' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'dropdown 4' })).toHaveTextContent('a');
    expect(screen.getByRole('button', { name: 'dropdown 5 multi' })).toHaveTextContent(
      'Select dropdown 5 multi 2 selected',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('should list disabled connection type for existing instance', () => {
    render(
      <ManageConnectionModal
        isEdit
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connection={mockConnection({
          name: 's3-connection',
          description: 's3 desc',
          connectionType: 's3',
          data: { env1: window.btoa('saved data') },
        })}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 's3',
            enabled: false,
            fields: [
              {
                type: 'short-text',
                name: 'short text 1',
                envVar: 'env1',
                properties: {},
              },
            ],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'postgres',
          }),
        ]}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('s3');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue('s3-connection');
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue('s3 desc');
    expect(screen.getByRole('textbox', { name: 'short text 1' })).toHaveValue('saved data');
  });

  it('should list non matching values as short text', async () => {
    render(
      <ManageConnectionModal
        isEdit
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connection={mockConnection({
          name: 's3-connection',
          description: 's3 desc',
          connectionType: 's3',
          data: {
            UNMATCHED_1: window.btoa('unmatched1!'),
            env1: window.btoa('true'),
            UNMATCHED_2: window.btoa('unmatched2!'),
          },
        })}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 's3',
            fields: [
              {
                type: 'boolean',
                name: 'Checkbox field',
                envVar: 'env1',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('s3');
    expect(screen.getByRole('checkbox', { name: 'Checkbox field' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'UNMATCHED_1' })).toHaveValue('unmatched1!');
    expect(screen.getByRole('textbox', { name: 'UNMATCHED_2' })).toHaveValue('unmatched2!');
  });

  it('should list non matching values as short text with missing connection type', async () => {
    render(
      <ManageConnectionModal
        isEdit
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connection={mockConnection({
          name: 's3-connection',
          description: 's3 desc',
          connectionType: 's3',
          data: {
            UNMATCHED_1: window.btoa('unmatched1!'),
            env1: window.btoa('true'),
            UNMATCHED_2: window.btoa('unmatched2!'),
          },
        })}
        connectionTypes={[]}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('s3');
    expect(screen.getByRole('textbox', { name: 'UNMATCHED_1' })).toHaveValue('unmatched1!');
    expect(screen.getByRole('textbox', { name: 'env1' })).toHaveValue('true');
    expect(screen.getByRole('textbox', { name: 'UNMATCHED_2' })).toHaveValue('unmatched2!');
  });
});

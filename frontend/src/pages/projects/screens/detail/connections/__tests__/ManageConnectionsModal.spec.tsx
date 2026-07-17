import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import * as areasModule from '@odh-dashboard/plugin-core/areas';
import { ManageConnectionModal } from '#~/pages/projects/screens/detail/connections/ManageConnectionsModal';
import { mockConnectionTypeConfigMapObj } from '#~/__mocks__/mockConnectionType';
import { mockProjectK8sResource } from '#~/__mocks__';
import { mockConnection } from '#~/__mocks__/mockConnection';
import * as connectionTestService from '#~/services/connectionTestService';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn().mockReturnValue({ status: true }),
}));

const mockUseIsAreaAvailable = jest.mocked(areasModule.useIsAreaAvailable);

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
                properties: { min: 0, max: 100 },
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

    // numeric - values outside min/max are auto-corrected on blur
    await act(async () => {
      fireEvent.change(numeric, {
        target: { value: '-10' },
      });
      fireEvent.blur(numeric);
    });
    // Value is clamped to min (0), so button remains enabled
    expect(createButton).toBeEnabled();

    await act(async () => {
      fireEvent.change(numeric, {
        target: { value: '2' },
      });
      fireEvent.blur(numeric);
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

describe('ManageConnectionModal test connection', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn().mockResolvedValue(() => undefined);
  let mockedTestConnection: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedTestConnection = jest
      .spyOn(connectionTestService, 'testConnection')
      .mockResolvedValue({ success: true, message: 'ok' });
  });

  afterEach(() => {
    mockedTestConnection.mockRestore();
  });

  const renderModal = () =>
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 's3',
            fields: [
              {
                type: 'short-text',
                name: 'Endpoint',
                envVar: 'endpoint',
                required: true,
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

  it('should render Test connection button in footer', () => {
    renderModal();
    expect(screen.getByTestId('test-connection-button')).toBeInTheDocument();
  });

  it('should show Not tested status label in header by default', () => {
    renderModal();
    expect(screen.getByTestId('connection-test-label-not-tested')).toBeInTheDocument();
  });

  it('should show Testing status when test button clicked', async () => {
    mockedTestConnection.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-test-label-testing')).toBeInTheDocument();
  });

  it('should show success alert on successful test', async () => {
    mockedTestConnection.mockResolvedValue({ success: true, message: 'Connection successful' });
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-test-success-alert')).toBeInTheDocument();
    expect(screen.getByTestId('connection-test-label-verified')).toBeInTheDocument();
  });

  it('should show danger alert on failed test', async () => {
    mockedTestConnection.mockResolvedValue({
      success: false,
      error: 'AUTH_FAILED',
      message: 'Invalid credentials',
    });
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-test-failure-alert')).toBeInTheDocument();
    expect(screen.getByTestId('connection-test-label-failed')).toBeInTheDocument();
  });

  it('should disable Test connection button when no connection type is selected', () => {
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'type one',
            fields: [{ type: 'short-text', name: 'Field', envVar: 'env1', properties: {} }],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type two',
            fields: [{ type: 'short-text', name: 'Field', envVar: 'env2', properties: {} }],
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('test-connection-button')).toBeDisabled();
  });

  it('should reset test status when connection type is changed', async () => {
    mockedTestConnection.mockResolvedValue({ success: true, message: 'ok' });

    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'type one',
            fields: [{ type: 'short-text', name: 'Field 1', envVar: 'env1', properties: {} }],
          }),
          mockConnectionTypeConfigMapObj({
            name: 'type two',
            fields: [{ type: 'short-text', name: 'Field 2', envVar: 'env2', properties: {} }],
          }),
        ]}
      />,
    );

    // Select type one
    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /type one/ }).click();
    });

    // Run the test
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-test-label-verified')).toBeInTheDocument();

    // Change connection type
    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: /type two/ }).click();
    });

    expect(screen.getByTestId('connection-test-label-not-tested')).toBeInTheDocument();
  });

  it('should reset test status when a credential field value is changed', async () => {
    mockedTestConnection.mockResolvedValue({ success: true, message: 'ok' });
    renderModal();

    // Run the test
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-test-label-verified')).toBeInTheDocument();

    // Change a credential field
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Endpoint' }), {
        target: { value: 'http://new-endpoint.com' },
      });
    });

    expect(screen.getByTestId('connection-test-label-not-tested')).toBeInTheDocument();
  });

  it('should NOT reset test status when connection name is changed', async () => {
    mockedTestConnection.mockResolvedValue({ success: true, message: 'ok' });
    renderModal();

    // Run the test
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-test-label-verified')).toBeInTheDocument();

    // Change connection name — should NOT reset status
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'new-name' },
      });
    });

    expect(screen.getByTestId('connection-test-label-verified')).toBeInTheDocument();
  });

  it('should show expandable section for long error messages (>120 chars)', async () => {
    const longMessage = 'A'.repeat(150);
    mockedTestConnection.mockResolvedValue({
      success: false,
      message: longMessage,
    });
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-test-failure-alert')).toBeInTheDocument();
    expect(screen.getByText('Show additional information')).toBeInTheDocument();
  });

  it('should not block Create button while test is in progress', async () => {
    mockedTestConnection.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    renderModal();

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Endpoint' }), {
        target: { value: 'http://example.com' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    const createButton = screen.getByTestId('modal-submit-button');
    expect(createButton).not.toBeDisabled();
  });
});

describe('ManageConnectionModal buildFieldValues integration', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn().mockResolvedValue(() => undefined);
  let mockedTestConnection: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedTestConnection = jest
      .spyOn(connectionTestService, 'testConnection')
      .mockResolvedValue({ success: true, message: 'ok' });
  });

  afterEach(() => {
    mockedTestConnection.mockRestore();
  });

  it('should convert string, boolean, number, and array field values when testing', async () => {
    render(
      <ManageConnectionModal
        isEdit
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connection={mockConnection({
          name: 'test-conn',
          connectionType: 'multi-type',
          data: {
            textField: window.btoa('hello'),
            boolField: window.btoa('true'),
            numField: window.btoa('42'),
            arrField: window.btoa('["a","b"]'),
          },
        })}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'multi-type',
            fields: [
              { type: 'short-text', name: 'Text', envVar: 'textField', properties: {} },
              {
                type: 'boolean',
                name: 'Bool',
                envVar: 'boolField',
                properties: { label: 'Enable' },
              },
              { type: 'numeric', name: 'Num', envVar: 'numField', properties: {} },
              {
                type: 'dropdown',
                name: 'Arr',
                envVar: 'arrField',
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
        ]}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(mockedTestConnection).toHaveBeenCalledTimes(1);
    const callArgs = mockedTestConnection.mock.calls[0][0];
    expect(callArgs.connectionType).toBe('multi-type');
    expect(callArgs.fieldValues.textField).toBe('hello');
    expect(callArgs.fieldValues.boolField).toBe('true');
    expect(callArgs.fieldValues.numField).toBe('42');
    expect(callArgs.fieldValues.arrField).toBe('["a","b"]');
  });

  it('should skip undefined field values when building test request', async () => {
    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'sparse-type',
            fields: [
              {
                type: 'short-text',
                name: 'Required Field',
                envVar: 'requiredField',
                required: true,
                properties: {},
              },
              {
                type: 'short-text',
                name: 'Optional Field',
                envVar: 'optionalField',
                properties: {},
              },
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Required Field' }), {
        target: { value: 'some-value' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(mockedTestConnection).toHaveBeenCalledTimes(1);
    const callArgs = mockedTestConnection.mock.calls[0][0];
    expect(callArgs.fieldValues.requiredField).toBe('some-value');
    expect(callArgs.fieldValues).not.toHaveProperty('optionalField');
  });
});

describe('ManageConnectionModal feature flag', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn().mockResolvedValue(() => undefined);

  it('should hide test connection UI when feature flag is disabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: false } as ReturnType<
      typeof areasModule.useIsAreaAvailable
    >);

    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 's3',
            fields: [{ type: 'short-text', name: 'Endpoint', envVar: 'endpoint', properties: {} }],
          }),
        ]}
      />,
    );

    expect(screen.queryByTestId('test-connection-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connection-test-label-not-tested')).not.toBeInTheDocument();

    mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
      typeof areasModule.useIsAreaAvailable
    >);
  });

  it('should show test connection UI when feature flag is enabled', () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
      typeof areasModule.useIsAreaAvailable
    >);

    render(
      <ManageConnectionModal
        project={mockProjectK8sResource({})}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 's3',
            fields: [{ type: 'short-text', name: 'Endpoint', envVar: 'endpoint', properties: {} }],
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('test-connection-button')).toBeInTheDocument();
    expect(screen.getByTestId('connection-test-label-not-tested')).toBeInTheDocument();
  });
});

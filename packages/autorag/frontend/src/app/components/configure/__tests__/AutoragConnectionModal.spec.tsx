import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { mockConnectionTypeConfigMapObj } from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import * as secretsApi from '@odh-dashboard/internal/api/k8s/secrets';
import { AutoragConnectionModal } from '../AutoragConnectionModal';

const TEST_PROJECT = 'my-project';

jest.mock('@odh-dashboard/internal/api/k8s/secrets', () => ({
  createSecret: jest.fn(),
}));

const createSecretMock = jest.mocked(secretsApi.createSecret);

describe('AutoragConnectionModal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  it('should preselect connection type if only one', () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
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
    expect(screen.getByRole('heading', { name: 'Add a connection' })).toBeInTheDocument();
  });

  it('should list connection types and select one', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
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

  it('should enable Add connection button when required fields filled and all valid', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
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

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    expect(addButton).toBeDisabled();

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

    expect(addButton).toBeEnabled();
    await act(async () => {
      addButton.click();
    });
    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalledWith(true);
  });

  it('should enable Add connection once field validations are valid', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
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
    const addButton = screen.getByRole('button', { name: 'Add connection' });

    await act(async () => {
      fireEvent.change(connectionName, {
        target: { value: 'name entry' },
      });
    });
    expect(addButton).toBeEnabled();

    await act(async () => {
      fireEvent.change(uri, {
        target: { value: 'invalid uri' },
      });
      fireEvent.blur(uri);
    });
    expect(addButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(uri, {
        target: { value: 'http://localhost' },
      });
      fireEvent.blur(uri);
    });
    expect(addButton).toBeEnabled();

    await act(async () => {
      fireEvent.change(numeric, {
        target: { value: '-10' },
      });
    });
    expect(addButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(numeric, {
        target: { value: '2' },
      });
    });
    expect(addButton).toBeEnabled();

    await act(async () => {
      addButton.click();
    });
    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalledWith(true);
  });

  it('should clear type-specific values and preserve name/description when switching types', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
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
      const optionTwo = await screen.findByRole('option', { name: /type two/ });
      optionTwo.click();
    });
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 2' })).toHaveValue('');
  });

  it('should call onClose when cancel is clicked', async () => {
    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({
            name: 'the only type',
            fields: [],
          }),
        ]}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await act(async () => {
      fireEvent.click(cancelButton);
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should not call onClose with true when createSecret rejects', async () => {
    createSecretMock.mockRejectedValueOnce(new Error('API error'));

    render(
      <AutoragConnectionModal
        project={TEST_PROJECT}
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
            ],
          }),
        ]}
      />,
    );

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'my-conn' },
      });
    });

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    await act(async () => {
      addButton.click();
    });

    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalledWith(true);
  });
});

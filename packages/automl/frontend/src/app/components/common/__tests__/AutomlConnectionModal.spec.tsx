import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockConnectionTypeConfigMapObj } from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import * as secretsApi from '@odh-dashboard/internal/api/k8s/secrets';
import AutomlConnectionModal from '~/app/components/common/AutomlConnectionModal';

const TEST_PROJECT = 'my-project';

jest.mock('@odh-dashboard/internal/api/k8s/secrets', () => ({
  createSecret: jest.fn(),
}));

const createSecretMock = jest.mocked(secretsApi.createSecret);

describe('AutomlConnectionModal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createSecretMock.mockResolvedValue({} as Awaited<ReturnType<typeof createSecretMock>>);
  });

  it('should preselect connection type if only one', () => {
    render(
      <AutomlConnectionModal
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
    const user = userEvent.setup();

    render(
      <AutomlConnectionModal
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

    await user.click(screen.getByRole('button', { name: 'Typeahead menu toggle' }));
    expect(screen.getByRole('option', { name: /type one/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /type two/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /type three disabled/ })).toBeFalsy();

    await user.click(screen.getByRole('option', { name: /type one/ }));
    expect(screen.getByRole('combobox')).toHaveValue('type one');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toBeVisible();
  });

  it('should enable Add connection button when required fields filled and all valid', async () => {
    const user = userEvent.setup();

    render(
      <AutomlConnectionModal
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

    await user.type(screen.getByRole('textbox', { name: 'Connection name' }), 'a');
    await user.type(screen.getByRole('textbox', { name: 'short text 1' }), 'b');
    await user.type(screen.getByRole('textbox', { name: 'text 2' }), 'c');
    await user.click(screen.getByRole('button', { name: 'dropdown 4' }));
    await user.click(screen.getByRole('option', { name: /^a/i }));

    expect(addButton).toBeEnabled();
    await user.click(addButton);
    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalledWith(true);
  });

  it('should enable Add connection once field validations are valid', async () => {
    const user = userEvent.setup();

    render(
      <AutomlConnectionModal
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
    const addButton = screen.getByRole('button', { name: 'Add connection' });

    await user.type(connectionName, 'name entry');
    expect(addButton).toBeEnabled();

    await user.clear(uri);
    await user.type(uri, 'invalid uri');
    await user.click(connectionName); // Trigger blur by clicking elsewhere
    expect(addButton).toBeDisabled();

    await user.clear(uri);
    await user.type(uri, 'http://localhost');
    await user.click(connectionName); // Trigger blur by clicking elsewhere
    expect(addButton).toBeEnabled();

    await user.click(addButton);
    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalledWith(true);
  });

  it('should clear type-specific values and preserve name/description when switching types', async () => {
    const user = userEvent.setup();

    render(
      <AutomlConnectionModal
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

    await user.click(screen.getByRole('button', { name: 'Typeahead menu toggle' }));
    await user.click(screen.getByRole('option', { name: /type one/ }));

    await user.type(
      screen.getByRole('textbox', { name: 'Connection name' }),
      'connection one name',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Connection description' }),
      'connection one desc',
    );
    await user.type(screen.getByRole('textbox', { name: 'Short text 1' }), 'one field');

    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toHaveValue('one field');

    await user.click(screen.getByRole('button', { name: 'Typeahead menu toggle' }));
    await user.click(screen.getByRole('option', { name: /type two/ }));

    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue(
      'connection one name',
    );
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue(
      'connection one desc',
    );
    expect(screen.getByRole('textbox', { name: 'Short text 2' })).toHaveValue('');
  });

  it('should call onClose when cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AutomlConnectionModal
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
    await user.click(cancelButton);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should not call onClose with true when createSecret rejects', async () => {
    const user = userEvent.setup();
    createSecretMock.mockRejectedValueOnce(new Error('API error'));

    render(
      <AutomlConnectionModal
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

    await user.type(screen.getByRole('textbox', { name: 'Connection name' }), 'my-conn');

    const addButton = screen.getByRole('button', { name: 'Add connection' });
    await user.click(addButton);

    expect(createSecretMock).toHaveBeenCalled();
    expect(onSubmitMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalledWith(true);
  });
});

import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ManageConnectionModal } from '~/pages/projects/screens/detail/connections/ManageConnectionsModal';
import { mockConnectionTypeConfigMapObj } from '~/__mocks__/mockConnectionType';

describe('Add connection modal', () => {
  const onCloseMock = jest.fn();
  const onSubmitMock = jest.fn().mockResolvedValue(() => undefined);

  it('should preselect connection type if only one', async () => {
    render(
      <ManageConnectionModal
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

    expect(screen.getByRole('dialog', { name: 'Add Connection' })).toBeTruthy();
    expect(screen.getByRole('combobox')).toHaveValue('the only type');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Short text' })).toBeVisible();
  });

  it('should list connection types and select one', async () => {
    render(
      <ManageConnectionModal
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
    expect(screen.getByRole('option', { name: 'type one' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'type two' })).toBeTruthy();

    await act(async () => {
      screen.getByRole('option', { name: 'type one' }).click();
    });
    expect(screen.getByRole('combobox')).toHaveValue('type one');
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Short text 1' })).toBeVisible();
  });

  it('should enable create button when required fields filled', async () => {
    render(
      <ManageConnectionModal
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

  it('should clear or restore entries when switching types', async () => {
    render(
      <ManageConnectionModal
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
      screen.getByRole('option', { name: 'type one' }).click();
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
      screen.getByRole('option', { name: 'type two' }).click();
    });
    expect(screen.getByRole('textbox', { name: 'Connection name' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Connection description' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Short text 2' })).toHaveValue('');

    await act(async () => {
      screen.getByRole('button', { name: 'Typeahead menu toggle' }).click();
    });
    await act(async () => {
      screen.getByRole('option', { name: 'type one' }).click();
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

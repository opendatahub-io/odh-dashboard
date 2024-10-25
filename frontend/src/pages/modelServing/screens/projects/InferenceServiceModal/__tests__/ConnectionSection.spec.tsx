import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import { mockConnection } from '~/__mocks__/mockConnection';
import { mockConnectionTypeConfigMapObj } from '~/__mocks__/mockConnectionType';
import { mockInferenceServiceModalData } from '~/__mocks__/mockInferenceServiceModalData';
import { ConnectionSection } from '~/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionSection';
import { InferenceServiceStorageType } from '~/pages/modelServing/screens/types';

jest.mock('~/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: jest.fn().mockReturnValue([
    [
      mockConnectionTypeConfigMapObj({
        name: 's3',
        fields: [
          {
            type: 'short-text',
            name: 'Access key',
            envVar: 'AWS_ACCESS_KEY_ID',
            properties: {},
          },
          {
            type: 'short-text',
            name: 'Secret key',
            envVar: 'AWS_SECRET_ACCESS_KEY',
            properties: {},
          },
          {
            type: 'short-text',
            name: 'Endpoint',
            envVar: 'AWS_S3_ENDPOINT',
            properties: {},
          },
          {
            type: 'short-text',
            name: 'Bucket',
            envVar: 'AWS_S3_BUCKET',
            properties: {},
          },
        ],
      }),
      mockConnectionTypeConfigMapObj({ name: 'uri' }),
    ],
  ]),
}));
jest.mock('~/pages/projects/screens/detail/connections/useConnections', () =>
  jest
    .fn()
    .mockReturnValue([
      [mockConnection({ name: 's3-connection' }), mockConnection({ name: 'uri-connection' })],
    ]),
);

describe('ConnectionsFormSection', () => {
  it('should select existing connection', async () => {
    const mockSetData = jest.fn();
    const mockSetConnection = jest.fn();
    const result = render(
      <ConnectionSection
        data={mockInferenceServiceModalData({
          storage: {
            type: InferenceServiceStorageType.EXISTING_STORAGE,
            path: '',
            dataConnection: '',
            awsData: [],
          },
        })}
        setData={mockSetData}
        setConnection={mockSetConnection}
        setIsConnectionValid={() => undefined}
      />,
    );

    expect(result.getByRole('radio', { name: 'Existing connection' })).toBeChecked();

    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'folder-path' })).toHaveValue('');

    await act(async () => result.getByRole('button', { name: 'Typeahead menu toggle' }).click());
    await act(async () => result.getByRole('option', { name: 's3-connection' }).click());
    expect(mockSetData).toHaveBeenLastCalledWith('storage', {
      type: InferenceServiceStorageType.EXISTING_STORAGE,
      path: '',
      dataConnection: 's3-connection',
      awsData: [],
    });

    await act(async () =>
      fireEvent.change(result.getByRole('textbox', { name: 'folder-path' }), {
        target: { value: 'models/fraud' },
      }),
    );
    expect(mockSetData).toHaveBeenLastCalledWith('storage', {
      type: InferenceServiceStorageType.EXISTING_STORAGE,
      path: 'models/fraud',
      dataConnection: '',
      awsData: [],
    });
  });

  it('should show existing connection', async () => {
    const result = render(
      <ConnectionSection
        data={mockInferenceServiceModalData({
          storage: {
            type: InferenceServiceStorageType.EXISTING_STORAGE,
            path: 'models/fraud',
            dataConnection: 's3-connection',
            awsData: [],
          },
        })}
        setData={() => undefined}
        setConnection={() => undefined}
        setIsConnectionValid={() => undefined}
      />,
    );

    expect(result.getByRole('radio', { name: 'Existing connection' })).toBeChecked();

    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('s3-connection');
    expect(result.getByRole('textbox', { name: 'folder-path' })).toHaveValue('models/fraud');
  });

  it('should render new connection radio selection', async () => {
    const mockSetData = jest.fn();
    const mockSetConnection = jest.fn();
    const result = render(
      <ConnectionSection
        data={mockInferenceServiceModalData({
          storage: {
            type: InferenceServiceStorageType.NEW_STORAGE,
            path: '',
            dataConnection: '',
            awsData: [],
          },
        })}
        setData={mockSetData}
        setConnection={mockSetConnection}
        setIsConnectionValid={() => undefined}
      />,
    );

    expect(result.getByRole('radio', { name: 'New connection' })).toBeChecked();

    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'folder-path' })).toHaveValue('');

    await act(async () => result.getByRole('button', { name: 'Typeahead menu toggle' }).click());
    await act(async () => result.getByRole('option', { name: /s3/ }).click());

    expect(result.getByRole('textbox', { name: 'Connection name' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Connection description' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Access key' })).toHaveValue('');
  });
});

import React, { act } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { mockConnection } from '#~/__mocks__/mockConnection';
import {
  mockConnectionTypeConfigMapObj,
  mockOciConnectionType,
} from '#~/__mocks__/mockConnectionType';
import { mockInferenceServiceModalData } from '#~/__mocks__/mockInferenceServiceModalData';
import { ConnectionSection } from '#~/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionSection';
import { InferenceServiceStorageType } from '#~/pages/modelServing/screens/types';

jest.mock('#~/utilities/useWatchConnectionTypes', () => ({
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
      mockOciConnectionType(),
    ],
  ]),
}));
jest.mock('#~/pages/projects/screens/detail/connections/useConnections', () =>
  jest.fn().mockReturnValue([
    [
      mockConnection({
        name: 's3-connection',
        data: {
          AWS_ACCESS_KEY_ID: 'test',
          AWS_SECRET_ACCESS_KEY: 'test',
          AWS_S3_ENDPOINT: 'test',
          AWS_S3_BUCKET: 'test',
        },
      }),
      mockConnection({ name: 'uri-connection' }),
    ],
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
        initialNewConnectionType={undefined}
        initialNewConnectionValues={{}}
        connection={undefined}
        setConnection={mockSetConnection}
        setIsConnectionValid={() => undefined}
        loaded
        connections={[
          {
            connection: mockConnection({
              name: 's3-connection',
              data: {
                AWS_ACCESS_KEY_ID: 'test',
                AWS_SECRET_ACCESS_KEY: 'test',
                AWS_S3_ENDPOINT: 'test',
                AWS_S3_BUCKET: 'test',
              },
            }),
          },
          { connection: mockConnection({ name: 'uri-connection' }) },
        ]}
      />,
    );

    expect(result.getByRole('radio', { name: 'Existing connection' })).toBeChecked();
    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('');

    await act(async () => result.getByRole('button', { name: 'Typeahead menu toggle' }).click());
    await act(async () => result.getByRole('option', { name: 's3-connection Type: s3' }).click());
    expect(mockSetData).toHaveBeenLastCalledWith('storage', {
      type: InferenceServiceStorageType.EXISTING_STORAGE,
      path: '',
      dataConnection: 's3-connection',
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
        initialNewConnectionType={undefined}
        initialNewConnectionValues={{}}
        connection={undefined}
        setConnection={() => undefined}
        setIsConnectionValid={() => undefined}
        loaded
        connections={[
          {
            connection: mockConnection({
              name: 's3-connection',
              data: {
                AWS_ACCESS_KEY_ID: 'test',
                AWS_SECRET_ACCESS_KEY: 'test',
                AWS_S3_ENDPOINT: 'test',
                AWS_S3_BUCKET: 'test',
              },
            }),
          },
          { connection: mockConnection({ name: 'uri-connection' }) },
        ]}
      />,
    );

    expect(result.getByRole('radio', { name: 'Existing connection' })).toBeChecked();

    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('s3-connection');
    expect(result.getByRole('textbox', { name: 'folder-path' })).toHaveValue('models/fraud');
  });

  it('should render create connection radio selection', async () => {
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
        initialNewConnectionType={undefined}
        initialNewConnectionValues={{}}
        connection={undefined}
        loaded
        setConnection={mockSetConnection}
        setIsConnectionValid={() => undefined}
      />,
    );

    expect(result.getByRole('radio', { name: 'Create connection' })).toBeChecked();
    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('');

    await act(async () => result.getByRole('button', { name: 'Typeahead menu toggle' }).click());
    await act(async () => result.getByRole('option', { name: /s3/ }).click());

    expect(result.getByRole('textbox', { name: 'Connection name' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Connection description' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Access key' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Secret key' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Endpoint' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Bucket' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'folder-path' })).toHaveValue('');
  });

  it('should show current URI', async () => {
    const result = render(
      <ConnectionSection
        existingUriOption="http://something.something/fraud.zip"
        data={mockInferenceServiceModalData({
          storage: {
            type: InferenceServiceStorageType.EXISTING_URI,
            uri: 'http://something.something/fraud.zip',
            path: '',
            dataConnection: '',
            awsData: [],
          },
        })}
        setData={() => undefined}
        initialNewConnectionType={undefined}
        initialNewConnectionValues={{}}
        connection={undefined}
        loaded
        setConnection={() => undefined}
        setIsConnectionValid={() => undefined}
      />,
    );

    expect(result.getByRole('radio', { name: 'Current URI' })).toBeChecked();
    expect(result.getByText('http://something.something/fraud.zip'));
  });

  it('should create OCI connection', async () => {
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
        initialNewConnectionType={undefined}
        initialNewConnectionValues={{}}
        connection={undefined}
        loaded
        setConnection={mockSetConnection}
        setIsConnectionValid={() => undefined}
      />,
    );

    expect(result.getByRole('radio', { name: 'Create connection' })).toBeChecked();
    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('');

    await act(async () => result.getByRole('button', { name: 'Typeahead menu toggle' }).click());
    await act(async () => result.getByRole('option', { name: /oci/ }).click());

    expect(result.getByRole('textbox', { name: 'Connection name' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Connection description' })).toHaveValue('');
    expect(result.getByRole('button', { name: 'Access type' })).toHaveTextContent(/0 selected/);
    expect(result.getByText('Secret details'));
    expect(result.getByRole('textbox', { name: 'Registry host' })).toHaveValue('');
    expect(result.getByRole('textbox', { name: 'Model URI' })).toHaveValue('');
  });

  it('should show error if OCI is push only', async () => {
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
        connection={undefined}
        loaded
        setConnection={mockSetConnection}
        setIsConnectionValid={() => undefined}
        initialNewConnectionType={undefined}
        initialNewConnectionValues={{}}
      />,
    );

    expect(result.getByRole('radio', { name: 'Create connection' })).toBeChecked();
    expect(result.getByRole('combobox', { name: 'Type to filter' })).toHaveValue('');

    await act(async () => result.getByRole('button', { name: 'Typeahead menu toggle' }).click());
    await act(async () => result.getByRole('option', { name: /oci/ }).click());
    await act(async () =>
      fireEvent.change(result.getByRole('textbox', { name: 'Connection name' }), {
        target: { value: 'new name' },
      }),
    );
    await act(async () => result.getByRole('button', { name: 'Access type' }).click());
    await act(async () =>
      result.getByRole('checkbox', { name: 'Push secret Value: Push' }).click(),
    );

    await waitFor(() =>
      expect(mockSetConnection).toHaveBeenLastCalledWith({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'new-name',
          namespace: 'caikit-example',
          labels: {
            'opendatahub.io/dashboard': 'true',
          },
          annotations: {
            'openshift.io/display-name': 'new name',
            'openshift.io/description': '',
            'opendatahub.io/connection-type-ref': 'oci-v1',
          },
        },
        stringData: {
          ACCESS_TYPE: '["Push"]',
        },
      }),
    );
    expect(result.getByRole('button', { name: 'Access type' })).toHaveTextContent(/1 selected/);
    expect(result.getByText('Access type must include pull')).toBeTruthy();
  });
});

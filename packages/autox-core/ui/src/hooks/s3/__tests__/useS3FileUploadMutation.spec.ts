import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { S3Api } from '../../../api/s3';
import { ProductContextProvider } from '../../../context';
import { useS3FileUploadMutation } from '../useS3FileUploadMutation';

const mockS3Api: S3Api = {
  uploadFileToS3: jest.fn(),
  getFiles: jest.fn(),
  fetchS3File: jest.fn(),
  fetchS3Json: jest.fn(),
};

jest.mock('../../../api', () => ({
  ...jest.requireActual('../../../api'),
  createS3Api: jest.fn(() => mockS3Api),
}));

const createWrapper = () => {
  const queryClient = new QueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      ProductContextProvider,
      {
        product: 'automl',
        apiPrefix: '/automl',
        bffApiVersion: 'v1',
        isRunInTerminalState: () => false,
        parseErrorStatus: () => undefined,
      },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
  return Wrapper;
};

describe('useS3FileUploadMutation', () => {
  const uploadFileToS3 = jest.mocked(mockS3Api.uploadFileToS3);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upload the file with hostPath defaulting to empty string', async () => {
    uploadFileToS3.mockResolvedValue({ uploaded: true, key: 'my-file.csv' });
    const file = new File(['content'], 'my-file.csv');

    const { result } = renderHook(() => useS3FileUploadMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ namespace: 'ns', secretName: 'secret', key: 'my-file.csv', file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(uploadFileToS3).toHaveBeenCalledWith(
      '',
      { namespace: 'ns', secretName: 'secret', key: 'my-file.csv' },
      file,
    );
    expect(result.current.data).toEqual({ uploaded: true, key: 'my-file.csv' });
  });

  it('should use the given hostPath when provided', async () => {
    uploadFileToS3.mockResolvedValue({ uploaded: true, key: 'my-file.csv' });
    const file = new File(['content'], 'my-file.csv');

    const { result } = renderHook(() => useS3FileUploadMutation('/custom-host'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ namespace: 'ns', secretName: 'secret', key: 'my-file.csv', file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(uploadFileToS3).toHaveBeenCalledWith(
      '/custom-host',
      { namespace: 'ns', secretName: 'secret', key: 'my-file.csv' },
      file,
    );
  });

  it('should surface upload errors', async () => {
    const uploadError = new Error('upload failed');
    uploadFileToS3.mockRejectedValue(uploadError);
    const file = new File(['content'], 'my-file.csv');

    const { result } = renderHook(() => useS3FileUploadMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ namespace: 'ns', secretName: 'secret', key: 'my-file.csv', file });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(uploadError);
  });
});

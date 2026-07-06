import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelLocationType } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import AutofillConnectionButton from '../AutofillConnectionButton';

jest.mock('@odh-dashboard/internal/concepts/modelRegistry/content/ConnectionModal', () => ({
  ConnectionModal: ({
    onClose,
    onSubmit,
  }: {
    onClose: () => void;
    onSubmit: (conn: { data?: Record<string, string>; metadata: { name: string } }) => void;
  }) => (
    <div data-testid="connection-modal">
      <button data-testid="modal-cancel" onClick={onClose}>
        Cancel
      </button>
      <button
        data-testid="modal-submit-s3"
        onClick={() =>
          onSubmit({
            metadata: { name: 'test-conn' },
            data: {},
          })
        }
      >
        Submit S3
      </button>
      <button
        data-testid="modal-submit-uri"
        onClick={() =>
          onSubmit({
            metadata: { name: 'test-conn' },
            data: { URI: btoa('https://example.com/model') },
          })
        }
      >
        Submit URI
      </button>
    </div>
  ),
}));

jest.mock('@odh-dashboard/internal/concepts/connectionTypes/utils', () => ({
  convertObjectStorageSecretData: () => [
    { key: 'AWS_S3_ENDPOINT', value: 'https://s3.amazonaws.com' },
    { key: 'AWS_S3_BUCKET', value: 'my-bucket' },
    { key: 'AWS_DEFAULT_REGION', value: 'us-east-1' },
  ],
}));

describe('AutofillConnectionButton', () => {
  it('renders the autofill button for ObjectStorage type', () => {
    render(
      <AutofillConnectionButton
        modelLocationType={ModelLocationType.ObjectStorage}
        setData={jest.fn()}
      />,
    );

    const button = screen.getByTestId('object-storage-autofill-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Autofill connection');
  });

  it('renders the autofill button for URI type', () => {
    render(
      <AutofillConnectionButton modelLocationType={ModelLocationType.URI} setData={jest.fn()} />,
    );

    expect(screen.getByTestId('uri-autofill-button')).toBeInTheDocument();
  });

  it('opens modal on click and closes it on cancel', () => {
    render(
      <AutofillConnectionButton
        modelLocationType={ModelLocationType.ObjectStorage}
        setData={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('connection-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('object-storage-autofill-button'));
    expect(screen.getByTestId('connection-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('modal-cancel'));
    expect(screen.queryByTestId('connection-modal')).not.toBeInTheDocument();
  });

  it('fills object storage fields on submit', () => {
    const setData = jest.fn();
    render(
      <AutofillConnectionButton
        modelLocationType={ModelLocationType.ObjectStorage}
        setData={setData}
      />,
    );

    fireEvent.click(screen.getByTestId('object-storage-autofill-button'));
    fireEvent.click(screen.getByTestId('modal-submit-s3'));

    expect(setData).toHaveBeenCalledWith('modelLocationEndpoint', 'https://s3.amazonaws.com');
    expect(setData).toHaveBeenCalledWith('modelLocationBucket', 'my-bucket');
    expect(setData).toHaveBeenCalledWith('modelLocationRegion', 'us-east-1');
  });

  it('fills URI field on submit', () => {
    const setData = jest.fn();
    render(
      <AutofillConnectionButton modelLocationType={ModelLocationType.URI} setData={setData} />,
    );

    fireEvent.click(screen.getByTestId('uri-autofill-button'));
    fireEvent.click(screen.getByTestId('modal-submit-uri'));

    expect(setData).toHaveBeenCalledWith('modelLocationURI', 'https://example.com/model');
  });
});

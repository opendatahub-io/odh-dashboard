import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageLabelsModal from '~/app/components/ManageLabelsModal';
import { createLabel, deleteLabel } from '~/app/api/dataRegistry';
import { RegistryAsset } from '~/app/hooks/useAssets';

jest.mock('~/app/api/dataRegistry', () => ({
  createLabel: jest.fn(),
  deleteLabel: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const mockCreateLabel = jest.mocked(createLabel);
const mockDeleteLabel = jest.mocked(deleteLabel);

const mockAssets: RegistryAsset[] = [
  {
    name: 'claims-data',
    description: 'Claims processing data',
    format: 'parquet',
    assetType: 'table',
    location: 's3://bucket/claims',
    connectionRef: 'minio-connection',
    labels: ['production', 'shared-label'],
    collection: 'analytics',
  },
  {
    name: 'raw-documents',
    description: 'PDF documents',
    format: 'application/pdf',
    assetType: 'volume',
    location: 's3://bucket/docs',
    connectionRef: '',
    labels: ['source-docs', 'shared-label'],
    collection: 'guidelines',
  },
  {
    name: 'embeddings',
    description: 'Vector embeddings',
    format: 'milvus',
    assetType: 'table',
    location: 'milvus://embeddings',
    connectionRef: '',
    labels: ['production'],
    collection: 'analytics',
  },
];

const mockLabels = ['production', 'source-docs', 'shared-label', 'unused-label'];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  project: 'test-project',
  labels: mockLabels,
  assets: mockAssets,
  onRefresh: jest.fn(),
};

const renderModal = (props?: Partial<React.ComponentProps<typeof ManageLabelsModal>>) =>
  render(<ManageLabelsModal {...defaultProps} {...props} />);

describe('ManageLabelsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with title and description', () => {
    renderModal();
    expect(screen.getByText('Manage labels')).toBeTruthy();
    expect(
      screen.getByText(
        'Create and delete labels to manage how assets are organized across this project.',
      ),
    ).toBeTruthy();
  });

  it('should render info alert', () => {
    renderModal();
    expect(screen.getByText('Changes affect all project assets')).toBeTruthy();
  });

  it('should render all labels with outline variant', () => {
    renderModal();
    mockLabels.forEach((label) => {
      expect(screen.getByTestId(`label-row-${label}`)).toBeTruthy();
    });
  });

  it('should show associated assets for each label', () => {
    renderModal();
    const productionRow = screen.getByTestId('label-row-production');
    expect(productionRow.textContent).toContain('claims-data');
    expect(productionRow.textContent).toContain('embeddings');

    const sharedRow = screen.getByTestId('label-row-shared-label');
    expect(sharedRow.textContent).toContain('claims-data');
    expect(sharedRow.textContent).toContain('raw-documents');

    const unusedRow = screen.getByTestId('label-row-unused-label');
    expect(unusedRow.textContent).toContain('–');
  });

  it('should show label belonging to multiple assets', () => {
    renderModal();
    const sharedRow = screen.getByTestId('label-row-shared-label');
    expect(sharedRow.textContent).toContain('claims-data');
    expect(sharedRow.textContent).toContain('raw-documents');
  });

  it('should filter labels by name', () => {
    renderModal();
    const filter = screen.getByTestId('label-filter');
    fireEvent.change(filter.querySelector('input')!, { target: { value: 'prod' } });

    expect(screen.getByTestId('label-row-production')).toBeTruthy();
    expect(screen.queryByTestId('label-row-source-docs')).toBeNull();
    expect(screen.queryByTestId('label-row-shared-label')).toBeNull();
  });

  it('should show create label row when create button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('create-label-button'));
    expect(screen.getByTestId('create-label-row')).toBeTruthy();
    expect(screen.getByTestId('new-label-input')).toBeTruthy();
    expect(screen.getByTestId('confirm-create-label').getAttribute('disabled')).not.toBeNull();
  });

  it('should enable confirm button when label name is entered', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('create-label-button'));
    fireEvent.change(screen.getByTestId('new-label-input'), { target: { value: 'new-label' } });
    expect(screen.getByTestId('confirm-create-label').getAttribute('disabled')).toBeNull();
  });

  it('should call createLabel and refresh on confirm', async () => {
    mockCreateLabel.mockResolvedValue({ name: 'new-label' });
    renderModal();
    fireEvent.click(screen.getByTestId('create-label-button'));
    fireEvent.change(screen.getByTestId('new-label-input'), { target: { value: 'new-label' } });
    fireEvent.click(screen.getByTestId('confirm-create-label'));

    await waitFor(() => {
      expect(mockCreateLabel).toHaveBeenCalledWith('test-project', { name: 'new-label' });
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  it('should cancel create label row', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('create-label-button'));
    expect(screen.getByTestId('create-label-row')).toBeTruthy();
    fireEvent.click(screen.getByTestId('cancel-create-label'));
    expect(screen.queryByTestId('create-label-row')).toBeNull();
  });

  it('should call deleteLabel and refresh on trash icon click', async () => {
    mockDeleteLabel.mockResolvedValue(undefined);
    renderModal();
    fireEvent.click(screen.getByTestId('delete-label-production'));

    await waitFor(() => {
      expect(mockDeleteLabel).toHaveBeenCalledWith('test-project', 'production');
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  it('should show error on delete failure', async () => {
    mockDeleteLabel.mockRejectedValue(new Error('Failed to delete label'));
    renderModal();
    fireEvent.click(screen.getByTestId('delete-label-production'));

    await waitFor(() => {
      expect(screen.getByTestId('manage-labels-error')).toBeTruthy();
    });
  });

  it('should not render when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Manage labels')).toBeNull();
  });
});

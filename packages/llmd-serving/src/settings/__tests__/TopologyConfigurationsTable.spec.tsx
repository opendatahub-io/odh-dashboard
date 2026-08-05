import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router';
import { k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { TopologyType } from '../../types';
import TopologyConfigurationsTable from '../TopologyConfigurationsTable';

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sDeleteResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  patchLLMInferenceServiceConfig: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/projects/components/DeleteModal', () => {
  const MockDeleteModal: React.FC<{
    onDelete: () => void;
    onClose: () => void;
    deleteName: string;
  }> = ({ onDelete, onClose, deleteName }) => (
    <div data-testid="delete-modal">
      <span data-testid="delete-name">{deleteName}</span>
      <button data-testid="confirm-delete" onClick={onDelete}>
        Confirm Delete
      </button>
      <button data-testid="cancel-delete" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
  return { __esModule: true, default: MockDeleteModal };
});

const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);
const mockUseNotification = jest.mocked(useNotification);

describe('TopologyConfigurationsTable', () => {
  const mockNotification = {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  };
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigate).mockReturnValue(mockNavigate);
    mockUseNotification.mockReturnValue(mockNotification as ReturnType<typeof useNotification>);
  });

  const openDeleteModal = () => {
    const kebab = screen.getByRole('button', { name: /kebab toggle/i });
    fireEvent.click(kebab);
    const deleteAction = screen.getByRole('menuitem', { name: /delete/i });
    fireEvent.click(deleteAction);
  };

  it('should close the delete modal on successful deletion', async () => {
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-topo-config',
      displayName: 'Test Topo Config',
      topologyType: TopologyType.SINGLE_NODE,
    });

    render(<TopologyConfigurationsTable configs={[config]} />);

    openDeleteModal();

    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockK8sDeleteResource).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNotification.error).not.toHaveBeenCalled();
      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });
  });

  it('should show error notification when deletion is blocked by a finalizer', async () => {
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'test-topo-config',
        namespace: 'opendatahub',
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
      },
      spec: {},
    });

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-topo-config',
      displayName: 'Test Topo Config',
      topologyType: TopologyType.SINGLE_NODE,
    });

    render(<TopologyConfigurationsTable configs={[config]} />);

    openDeleteModal();

    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Unable to delete configuration',
        'This configuration is currently in use by a deployment and cannot be deleted until the deployment is removed.',
      );
    });
  });

  it('should show error notification when delete request fails', async () => {
    mockK8sDeleteResource.mockRejectedValue(new Error('Network error'));

    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'test-topo-config',
      displayName: 'Test Topo Config',
      topologyType: TopologyType.SINGLE_NODE,
    });

    render(<TopologyConfigurationsTable configs={[config]} />);

    openDeleteModal();

    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockNotification.error).toHaveBeenCalledWith(
        'Error deleting configuration',
        'Network error',
      );
    });
  });
});

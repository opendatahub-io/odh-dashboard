import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchNIMModelNames, ModelInfo } from '#~/pages/modelServing/screens/projects/utils';
import { useNIMAccountConfig } from '#~/pages/modelServing/screens/projects/nim/useNIMAccountConfig';
import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
} from '#~/pages/modelServing/screens/types';
import NIMModelListSection from '#~/pages/modelServing/screens/projects/nim/NIMServiceModal/NIMModelListSection';

jest.mock('#~/pages/modelServing/screens/projects/utils', () => ({
  fetchNIMModelNames: jest.fn(),
}));

jest.mock('#~/pages/modelServing/screens/projects/nim/useNIMAccountConfig', () => ({
  useNIMAccountConfig: jest.fn(),
}));

const fetchNIMModelNamesMock = jest.mocked(fetchNIMModelNames);
const useNIMAccountConfigMock = jest.mocked(useNIMAccountConfig);

const mockInferenceServiceData: CreatingInferenceServiceObject = {
  name: 'test-inference',
  project: 'test-project',
  servingRuntimeName: 'test-runtime',
  format: { name: '' },
  storage: {
    type: InferenceServiceStorageType.NEW_STORAGE,
    path: '',
    dataConnection: '',
    awsData: [],
  },
};

const mockSetInferenceServiceData = jest.fn();
const mockSetServingRuntimeData = jest.fn();

const mockModels: ModelInfo[] = [
  {
    name: 'llama-3-8b-instruct',
    displayName: 'Llama 3 8B Instruct',
    shortDescription: 'Test model',
    namespace: 'nim/meta',
    tags: ['1.0.0', '1.1.0'],
    latestTag: '1.1.0',
    updatedDate: '2024-09-15T00:00:00Z',
  },
  {
    name: 'granite-8b-code',
    displayName: 'Granite 8B Code',
    shortDescription: 'Code model',
    namespace: 'nim/ibm',
    tags: ['2.0.0'],
    latestTag: '2.0.0',
    updatedDate: '2024-09-16T00:00:00Z',
  },
];

describe('NIMModelListSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registry fallback in getNIMImageName', () => {
    it('should use default nvcr.io registry when no air-gapped config exists', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        loading: false,
      });

      fetchNIMModelNamesMock.mockResolvedValue(mockModels);

      const user = userEvent.setup();

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      const option = await screen.findByText('Llama 3 8B Instruct - 1.0.0');
      await user.click(option);

      // Should construct image URL with default nvcr.io registry
      expect(mockSetServingRuntimeData).toHaveBeenCalledWith(
        'imageName',
        'nvcr.io/nim/meta/llama-3-8b-instruct:1.0.0',
      );
    });

    it('should use global registry from air-gapped ConfigMap when available', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        registry: 'internal-registry.company.com',
        imagePullSecret: 'custom-pull-secret',
        loading: false,
      });

      fetchNIMModelNamesMock.mockResolvedValue(mockModels);

      const user = userEvent.setup();

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      const option = await screen.findByText('Llama 3 8B Instruct - 1.0.0');
      await user.click(option);

      // Should use air-gapped registry
      expect(mockSetServingRuntimeData).toHaveBeenCalledWith(
        'imageName',
        'internal-registry.company.com/nim/meta/llama-3-8b-instruct:1.0.0',
      );
    });

    it('should use model-specific registry when available (highest precedence)', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        registry: 'internal-registry.company.com',
        loading: false,
      });

      const modelsWithCustomRegistry: ModelInfo[] = [
        {
          name: 'llama-3-8b-instruct',
          displayName: 'Llama 3 8B Instruct',
          shortDescription: 'Test model',
          namespace: 'nim/meta',
          tags: ['1.0.0'],
          latestTag: '1.0.0',
          updatedDate: '2024-09-15T00:00:00Z',
          registry: 'special-registry.io', // Model-specific override
        },
      ];

      fetchNIMModelNamesMock.mockResolvedValue(modelsWithCustomRegistry);

      const user = userEvent.setup();

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      const option = await screen.findByText('Llama 3 8B Instruct - 1.0.0');
      await user.click(option);

      // Should use model-specific registry (overrides global registry)
      expect(mockSetServingRuntimeData).toHaveBeenCalledWith(
        'imageName',
        'special-registry.io/nim/meta/llama-3-8b-instruct:1.0.0',
      );
    });

    it('should use global registry when model-specific registry is not defined', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        registry: 'global-registry.io',
        loading: false,
      });

      const modelsWithoutCustomRegistry: ModelInfo[] = [
        {
          name: 'granite-8b-code',
          displayName: 'Granite 8B Code',
          shortDescription: 'Code model',
          namespace: 'nim/ibm',
          tags: ['2.0.0'],
          latestTag: '2.0.0',
          updatedDate: '2024-09-16T00:00:00Z',
          registry: undefined, // No model-specific registry
        },
      ];

      fetchNIMModelNamesMock.mockResolvedValue(modelsWithoutCustomRegistry);

      const user = userEvent.setup();

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      const option = await screen.findByText('Granite 8B Code - 2.0.0');
      await user.click(option);

      // Should fall back to global registry
      expect(mockSetServingRuntimeData).toHaveBeenCalledWith(
        'imageName',
        'global-registry.io/nim/ibm/granite-8b-code:2.0.0',
      );
    });
  });

  describe('Loading states', () => {
    it('should disable select when account config is loading', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        loading: true,
      });

      fetchNIMModelNamesMock.mockResolvedValue(mockModels);

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        const menuToggle = screen.getByTestId('typeahead-menu-toggle');
        expect(menuToggle).toHaveAttribute('disabled', '');
      });
    });

    it('should enable select after account config finishes loading', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        loading: false,
      });

      fetchNIMModelNamesMock.mockResolvedValue(mockModels);

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        const menuToggle = screen.getByTestId('typeahead-menu-toggle');
        expect(menuToggle).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('Error handling', () => {
    it('should show error when fetchNIMModelNames fails', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        loading: false,
      });

      fetchNIMModelNamesMock.mockRejectedValue(new Error('Network error'));

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('There was a problem fetching the NIM models. Please try again later.'),
        ).toBeInTheDocument();
      });
    });

    it('should show error when no models are found', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        loading: false,
      });

      fetchNIMModelNamesMock.mockResolvedValue(undefined);

      render(
        <NIMModelListSection
          inferenceServiceData={mockInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('No NVIDIA NIM models found. Please check the installation.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Editing mode', () => {
    it('should disable select when isEditing is true', async () => {
      useNIMAccountConfigMock.mockReturnValue({
        loading: false,
      });

      fetchNIMModelNamesMock.mockResolvedValue(mockModels);

      const editingInferenceServiceData = {
        ...mockInferenceServiceData,
        format: { name: 'llama-3-8b-instruct' },
      };

      render(
        <NIMModelListSection
          inferenceServiceData={editingInferenceServiceData}
          setInferenceServiceData={mockSetInferenceServiceData}
          setServingRuntimeData={mockSetServingRuntimeData}
          isEditing
        />,
      );

      await waitFor(() => {
        const menuToggle = screen.getByTestId('typeahead-menu-toggle');
        expect(menuToggle).toHaveAttribute('disabled', '');
      });
    });
  });
});

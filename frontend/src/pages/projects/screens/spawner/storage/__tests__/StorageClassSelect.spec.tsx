// StorageClassSelect.spec.tsx
// Tests for the StorageClassSelect component, focusing on the showDefaultWhenNoConfig prop, sorting, and edge cases.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StorageClassSelect from '#~/pages/projects/screens/spawner/storage/StorageClassSelect';
import { StorageClassConfig, StorageClassKind } from '#~/k8sTypes';

// Helper to create a mock storage class
const createMockStorageClass = (name: string): StorageClassKind => ({
  metadata: { name },
  provisioner: 'test-provisioner',
  reclaimPolicy: 'Delete',
  volumeBindingMode: 'Immediate',
  allowVolumeExpansion: true,
  apiVersion: 'storage.k8s.io/v1',
  kind: 'StorageClass',
});

// Mock dependencies
jest.mock('#~/pages/projects/screens/spawner/storage/useDefaultStorageClass', () => ({
  __esModule: true,
  useDefaultStorageClass: jest.fn(),
}));

jest.mock('#~/pages/storageClasses/utils', () => ({
  getStorageClassConfig: jest.fn(),
  getPossibleStorageClassAccessModes: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/spawner/storage/AccessModeLabel', () => ({
  __esModule: true,
  default: jest.fn(({ accessMode }) => (
    <span data-testid={`${accessMode}-label`}>{accessMode}</span>
  )),
}));

jest.mock('#~/components/SimpleSelect', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Import mocked modules
import { useDefaultStorageClass } from '#~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import {
  getStorageClassConfig,
  getPossibleStorageClassAccessModes,
} from '#~/pages/storageClasses/utils';
import SimpleSelect from '#~/components/SimpleSelect';

const mockUseDefaultStorageClass = useDefaultStorageClass as jest.Mock;
const mockGetStorageClassConfig = getStorageClassConfig as jest.Mock;
const mockGetPossibleStorageClassAccessModes = getPossibleStorageClassAccessModes as jest.Mock;
const mockSimpleSelect = SimpleSelect as jest.Mock;

// Default props and helpers
const mockSetStorageClassName = jest.fn();
const mockStorageClasses = [
  { metadata: { name: 'storage-class-1' } },
  { metadata: { name: 'storage-class-2' } },
] as StorageClassKind[];

const mockStorageClassConfig: StorageClassConfig = {
  displayName: 'Test Storage Class',
  description: 'Test Description',
  isEnabled: true,
  isDefault: false,
  lastModified: '2024-01-01T00:00:00Z',
  accessModeSettings: {
    ReadWriteOnce: true,
    ReadWriteMany: false,
    ReadOnlyMany: false,
    ReadWriteOncePod: false,
  },
};

const defaultProps = {
  storageClasses: mockStorageClasses,
  storageClassesLoaded: true,
  selectedStorageClassConfig: mockStorageClassConfig,
  storageClassName: 'storage-class-1',
  setStorageClassName: mockSetStorageClassName,
  isRequired: false,
  disableStorageClassSelect: false,
  showDefaultWhenNoConfig: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default mock implementations
  mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[0]]);
  mockGetStorageClassConfig.mockReturnValue(mockStorageClassConfig);
  mockGetPossibleStorageClassAccessModes.mockReturnValue({
    adminSupportedAccessModes: ['ReadWriteOnce'],
    openshiftSupportedAccessModes: ['ReadWriteOnce'],
  });
  mockSimpleSelect.mockImplementation(({ options, onChange, isDisabled, placeholder }) => (
    <div data-testid="simple-select">
      <select
        data-testid="storage-class-select"
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option: { key: string; label: string; isDisabled: boolean }) => (
          <option key={option.key} value={option.key} disabled={option.isDisabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ));
});

// Tests for showDefaultWhenNoConfig prop and related behaviors

describe('StorageClassSelect - showDefaultWhenNoConfig Functionality', () => {
  describe('showDefaultWhenNoConfig Behavior', () => {
    it('shows all storage classes but disables the select when showDefaultWhenNoConfig is true and no ODH configs exist', () => {
      // No storage classes have ODH configs
      mockGetStorageClassConfig.mockReturnValue(null);
      mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[0]]);

      render(<StorageClassSelect {...defaultProps} showDefaultWhenNoConfig />);

      expect(mockSimpleSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ key: 'storage-class-1', isDisabled: true }),
            expect.objectContaining({ key: 'storage-class-2', isDisabled: true }),
          ]),
          isDisabled: true,
        }),
        expect.anything(),
      );
      // Should show all storage classes
      const { options: options1 } = mockSimpleSelect.mock.calls[0][0];
      expect(options1).toHaveLength(2);
    });

    it('returns null when no ODH configs exist and showDefaultWhenNoConfig is false', () => {
      mockGetStorageClassConfig.mockReturnValue(null);
      const { container } = render(
        <StorageClassSelect {...defaultProps} showDefaultWhenNoConfig={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('shows only enabled storage classes when ODH configs exist regardless of showDefaultWhenNoConfig', () => {
      const testStorageClasses = [
        createMockStorageClass('storage-class-1'),
        createMockStorageClass('storage-class-2'),
      ];
      // storage-class-1 enabled, storage-class-2 disabled
      mockGetStorageClassConfig.mockImplementation((sc) =>
        sc.metadata.name === 'storage-class-1'
          ? { ...mockStorageClassConfig, isEnabled: true, isDefault: true }
          : { ...mockStorageClassConfig, isEnabled: false, isDefault: false },
      );
      render(
        <StorageClassSelect
          storageClasses={testStorageClasses}
          storageClassesLoaded
          storageClassName=""
          setStorageClassName={jest.fn()}
          showDefaultWhenNoConfig
        />,
      );
      const { options, isDisabled } = mockSimpleSelect.mock.calls[0][0];
      expect(options).toHaveLength(1);
      expect(options[0]).toMatchObject({ key: 'storage-class-1', isDisabled: false });
      expect(isDisabled).toBe(false);
    });

    it('shows OpenShift default label when showDefaultWhenNoConfig is true and no ODH configs exist', () => {
      mockGetStorageClassConfig.mockReturnValue(null);
      mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[0]]);
      render(<StorageClassSelect {...defaultProps} showDefaultWhenNoConfig />);
      const { options: options2 } = mockSimpleSelect.mock.calls[0][0];
      // The first option should have the default label
      expect(
        options2[0].dropdownLabel.props.children[2].props.children.props.children.some(
          (child: React.ReactElement) =>
            child.props && child.props['data-testid'] === 'is-default-label',
        ),
      ).toBe(true);
    });

    it('enables the select when ODH configs exist', () => {
      mockGetStorageClassConfig.mockReturnValue(mockStorageClassConfig);
      render(<StorageClassSelect {...defaultProps} showDefaultWhenNoConfig />);
      expect(mockSimpleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ isDisabled: false }),
        expect.anything(),
      );
    });

    it('uses metadata name as label when no ODH configs exist', () => {
      mockGetStorageClassConfig.mockReturnValue(null);
      mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[0]]);
      render(<StorageClassSelect {...defaultProps} showDefaultWhenNoConfig />);
      expect(mockSimpleSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ label: 'storage-class-1' }),
            expect.objectContaining({ label: 'storage-class-2' }),
          ]),
        }),
        expect.anything(),
      );
    });
  });

  // Sorting and label logic
  describe('Storage Class Sorting with showDefaultWhenNoConfig', () => {
    it('shows all storage classes when showDefaultWhenNoConfig is true', () => {
      mockGetStorageClassConfig.mockReturnValue(null);
      mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[1]]);
      render(<StorageClassSelect {...defaultProps} showDefaultWhenNoConfig />);
      const { options } = mockSimpleSelect.mock.calls[0][0];
      expect(options).toHaveLength(2);
      expect(options[0].key).toBe('storage-class-1');
      expect(options[1].key).toBe('storage-class-2');
    });

    it('uses metadata name as label when no ODH configs exist', () => {
      mockGetStorageClassConfig.mockReturnValue(null);
      mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[0]]);
      render(<StorageClassSelect {...defaultProps} showDefaultWhenNoConfig />);
      expect(mockSimpleSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ label: 'storage-class-1' }),
            expect.objectContaining({ label: 'storage-class-2' }),
          ]),
        }),
        expect.anything(),
      );
    });
  });

  // Edge case handling
  describe('Edge Cases', () => {
    it('handles empty storage classes array with showDefaultWhenNoConfig', () => {
      mockGetStorageClassConfig.mockReturnValue(null);
      render(<StorageClassSelect {...defaultProps} storageClasses={[]} showDefaultWhenNoConfig />);
      expect(mockSimpleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ options: [] }),
        expect.anything(),
      );
    });

    it('handles missing default storage class with showDefaultWhenNoConfig', () => {
      mockGetStorageClassConfig.mockReturnValue(null);
      mockUseDefaultStorageClass.mockReturnValue([null]);
      render(<StorageClassSelect {...defaultProps} showDefaultWhenNoConfig />);
      // Should not crash and should render with all storage classes
      expect(screen.getByTestId('storage-class-select')).toBeInTheDocument();
      const { options } = mockSimpleSelect.mock.calls[0][0];
      expect(options).toHaveLength(2);
    });

    it('handles mixed ODH configs with showDefaultWhenNoConfig', () => {
      const testStorageClasses = [
        createMockStorageClass('storage-class-1'),
        createMockStorageClass('storage-class-2'),
      ];
      mockGetStorageClassConfig.mockImplementation((sc) =>
        sc.metadata.name === 'storage-class-1'
          ? { ...mockStorageClassConfig, isEnabled: true, isDefault: true }
          : { ...mockStorageClassConfig, isEnabled: false, isDefault: false },
      );
      render(
        <StorageClassSelect
          storageClasses={testStorageClasses}
          storageClassesLoaded
          storageClassName=""
          setStorageClassName={jest.fn()}
          showDefaultWhenNoConfig
        />,
      );
      const { options } = mockSimpleSelect.mock.calls[0][0];
      expect(options).toHaveLength(1);
      expect(options[0]).toMatchObject({ key: 'storage-class-1', isDisabled: false });
    });
  });
});

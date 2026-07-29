import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useParams } from 'react-router-dom';
import useModelVersionsByRegisteredModel from '~/app/hooks/useModelVersionsByRegisteredModel';
import { useModelDeploymentDetection } from '~/odh/utils/deploymentUtils';
import { ModelVersion, ModelState } from '~/app/types';
import ArchiveButtonDropdownItem from '~/odh/components/ArchiveButtonDropdownItem';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/useModelVersionsByRegisteredModel', () => jest.fn());

jest.mock('~/odh/utils/deploymentUtils', () => ({
  useModelDeploymentDetection: jest.fn(),
}));

const mockUseParams = jest.mocked(useParams);
const mockUseModelVersionsByRegisteredModel = jest.mocked(useModelVersionsByRegisteredModel);
const mockUseModelDeploymentDetection = jest.mocked(useModelDeploymentDetection);

const createMockDeploymentDetection = (overrides: {
  hasModelVersionDeployment?: (mvId: string) => { hasDeployment: boolean; loaded: boolean };
  hasRegisteredModelDeploymentByVersionIds?: (mvIds: string[]) => {
    hasDeployment: boolean;
    loaded: boolean;
  };
}) => ({
  hasModelVersionDeployment:
    overrides.hasModelVersionDeployment ??
    jest.fn().mockReturnValue({ hasDeployment: false, loaded: true }),
  hasRegisteredModelDeployment: jest.fn().mockReturnValue({ hasDeployment: false, loaded: true }),
  hasRegisteredModelDeploymentByVersionIds:
    overrides.hasRegisteredModelDeploymentByVersionIds ??
    jest.fn().mockReturnValue({ hasDeployment: false, loaded: true }),
  loaded: true,
  deployments: [],
});

const mockModelVersion: ModelVersion = {
  id: 'mv-1',
  name: 'version-1',
  registeredModelId: 'rm-1',
  state: ModelState.LIVE,
  createTimeSinceEpoch: '1000000',
  lastUpdateTimeSinceEpoch: '1000000',
  author: 'test',
  customProperties: {},
};

const renderInDropdown = (ui: React.ReactElement) => render(<div role="menu">{ui}</div>);

describe('ArchiveButtonDropdownItem', () => {
  const mockSetIsArchiveModalOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ registeredModelId: 'rm-1' });
    mockUseModelVersionsByRegisteredModel.mockReturnValue([
      { items: [mockModelVersion], size: 1, pageSize: 10, nextPageToken: '' },
      true,
      undefined,
      jest.fn(),
    ]);
  });

  describe('for registered models', () => {
    it('should disable archive when model has deployments', () => {
      mockUseModelDeploymentDetection.mockReturnValue(
        createMockDeploymentDetection({
          hasRegisteredModelDeploymentByVersionIds: jest
            .fn()
            .mockReturnValue({ hasDeployment: true, loaded: true }),
        }),
      );

      renderInDropdown(
        <ArchiveButtonDropdownItem setIsArchiveModalOpen={mockSetIsArchiveModalOpen} />,
      );

      const button = screen.getByRole('menuitem', { name: 'Archive model' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should enable archive when model has no deployments', () => {
      mockUseModelDeploymentDetection.mockReturnValue(createMockDeploymentDetection({}));

      renderInDropdown(
        <ArchiveButtonDropdownItem setIsArchiveModalOpen={mockSetIsArchiveModalOpen} />,
      );

      const button = screen.getByRole('menuitem', { name: 'Archive model' });
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should disable archive while deployments are loading', () => {
      mockUseModelVersionsByRegisteredModel.mockReturnValue([
        { items: [], size: 0, pageSize: 10, nextPageToken: '' },
        false,
        undefined,
        jest.fn(),
      ]);
      mockUseModelDeploymentDetection.mockReturnValue(createMockDeploymentDetection({}));

      renderInDropdown(
        <ArchiveButtonDropdownItem setIsArchiveModalOpen={mockSetIsArchiveModalOpen} />,
      );

      const button = screen.getByRole('menuitem', { name: 'Archive model' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('for model versions', () => {
    it('should disable archive when version has deployments', () => {
      mockUseModelDeploymentDetection.mockReturnValue(
        createMockDeploymentDetection({
          hasModelVersionDeployment: jest
            .fn()
            .mockReturnValue({ hasDeployment: true, loaded: true }),
        }),
      );

      renderInDropdown(
        <ArchiveButtonDropdownItem
          mv={mockModelVersion}
          setIsArchiveModalOpen={mockSetIsArchiveModalOpen}
        />,
      );

      const button = screen.getByRole('menuitem', { name: 'Archive model version' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should enable archive when version has no deployments', () => {
      mockUseModelDeploymentDetection.mockReturnValue(createMockDeploymentDetection({}));

      renderInDropdown(
        <ArchiveButtonDropdownItem
          mv={mockModelVersion}
          setIsArchiveModalOpen={mockSetIsArchiveModalOpen}
        />,
      );

      const button = screen.getByRole('menuitem', { name: 'Archive model version' });
      expect(button).not.toHaveAttribute('aria-disabled', 'true');
    });
  });
});

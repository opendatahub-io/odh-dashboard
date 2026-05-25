import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LineageNode } from '@odh-dashboard/internal/components/lineage/types';
import { useLineageClick } from '@odh-dashboard/internal/components/lineage/LineageClickContext';
import { useFeatureStoreProject } from '../../../../FeatureStoreContext';
import FeatureStoreLineageNodePopover from '../FeatureStoreLineageNodePopover';

jest.mock('../../../../FeatureStoreContext');
jest.mock('@odh-dashboard/internal/components/lineage/LineageClickContext');

const useFeatureStoreProjectMock = jest.mocked(useFeatureStoreProject);
const useLineageClickMock = jest.mocked(useLineageClick);

const mockProjectAndClickPosition = (): void => {
  const pillElement = document.createElement('button');
  useFeatureStoreProjectMock.mockReturnValue({
    currentProject: 'proj-a',
    setCurrentProject: jest.fn(),
    preferredFeatureStoreProject: null,
    updatePreferredFeatureStoreProject: jest.fn(),
  });
  useLineageClickMock.mockReturnValue({
    getLastClickPosition: () => ({ pillElement, x: 0, y: 0 }),
    setClickPosition: jest.fn(),
  });
};

describe('FeatureStoreLineageNodePopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render View all features link with features list route for feature_view node', () => {
    mockProjectAndClickPosition();

    const node: LineageNode = {
      id: 'n1',
      label: 'My view',
      entityType: 'batch_feature_view',
      fsObjectTypes: 'feature_view',
      name: 'node-name',
    };

    render(
      <MemoryRouter>
        <FeatureStoreLineageNodePopover node={node} isVisible onClose={jest.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /view all features/i })).toHaveAttribute(
      'href',
      '/develop-train/feature-store/features/proj-a?featureView=node-name',
    );
  });

  it('should not render View all features link for non-feature_view node', () => {
    mockProjectAndClickPosition();

    const node: LineageNode = {
      id: 'n2',
      label: 'Entity',
      entityType: 'entity',
      fsObjectTypes: 'entity',
      name: 'entity-name',
    };

    render(
      <MemoryRouter>
        <FeatureStoreLineageNodePopover node={node} isVisible onClose={jest.fn()} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /view all features/i })).not.toBeInTheDocument();
  });
});

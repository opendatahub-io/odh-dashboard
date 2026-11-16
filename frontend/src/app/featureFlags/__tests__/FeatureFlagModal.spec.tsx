import * as React from 'react';
import type { DashboardCommonConfig } from '@odh-dashboard/k8s-core';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeatureFlagModal from '#~/app/featureFlags/FeatureFlagModal';
import {
  advancedAIMLFlags,
  coreDashboardFlags,
  devTemporaryFeatureFlags,
  modelServingFlags,
  projectManagementFlags,
  techPreviewFlags,
} from '#~/concepts/areas/const';

jest.mock('#~/app/featureFlags/useDevFeatureFlags', () => ({
  ...jest.requireActual('#~/app/featureFlags/useDevFeatureFlags'),
  useDevFlags: () => [],
}));

const renderModal = (dashboardConfig: Partial<DashboardCommonConfig> = {}) =>
  render(
    <FeatureFlagModal
      dashboardConfig={dashboardConfig}
      devFeatureFlags={null}
      setDevFeatureFlag={jest.fn()}
      resetDevFeatureFlags={jest.fn()}
      onClose={jest.fn()}
    />,
  );

describe('FeatureFlagModal', () => {
  it('should list every tech preview and temporary developer flag on the Active tab', () => {
    renderModal();
    [...Object.keys(techPreviewFlags), ...Object.keys(devTemporaryFeatureFlags)].forEach((flag) => {
      expect(screen.getByTestId(`${flag}-checkbox`)).toBeInTheDocument();
    });
  });

  it('should list the mySubscriptions flag with its server value', () => {
    renderModal({ mySubscriptions: true });
    expect(screen.getByTestId('mySubscriptions-checkbox')).toBeChecked();
    expect(screen.getByTestId('mySubscriptions-value')).toHaveTextContent('true');
  });

  it('should list every legacy flag group on the Legacy tab', () => {
    renderModal();
    fireEvent.click(screen.getByRole('tab', { name: 'Legacy' }));
    [
      ...Object.keys(coreDashboardFlags),
      ...Object.keys(projectManagementFlags),
      ...Object.keys(modelServingFlags),
      ...Object.keys(advancedAIMLFlags),
    ].forEach((flag) => {
      expect(screen.getByTestId(`${flag}-checkbox`)).toBeInTheDocument();
    });
  });
});

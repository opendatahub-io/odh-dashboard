import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import HardwareProfileDetailsPopover from '../HardwareProfileDetailsPopover';

jest.mock('@odh-dashboard/internal/pages/hardwareProfiles/utils', () => ({
  getClusterQueueNameFromLocalQueues: jest.fn(),
  getHardwareProfileDescription: jest.fn((hp: HardwareProfileKind) => hp.spec.description),
  getHardwareProfileDisplayName: jest.fn(
    (hp: HardwareProfileKind) =>
      hp.metadata.annotations?.['openshift.io/display-name'] || hp.metadata.name,
  ),
}));

jest.mock('@odh-dashboard/internal/pages/projects/ProjectDetailsContext', () => {
  const { createContext } = require('react');
  return {
    ProjectDetailsContext: createContext({
      localQueues: { data: [], loaded: true, error: undefined },
    }),
  };
});

const mockHardwareProfile: HardwareProfileKind = {
  apiVersion: 'dashboard.opendatahub.io/v1alpha1',
  kind: 'HardwareProfile',
  metadata: {
    name: 'test-profile',
    namespace: 'test-ns',
    annotations: {
      'openshift.io/display-name': 'Test Profile',
    },
  },
  spec: {
    identifiers: [
      {
        identifier: 'cpu',
        displayName: 'CPU',
        resourceType: IdentifierResourceType.CPU,
        defaultCount: 2,
        minCount: 1,
        maxCount: 4,
      },
      {
        identifier: 'memory',
        displayName: 'Memory',
        resourceType: IdentifierResourceType.MEMORY,
        defaultCount: 4,
        minCount: 2,
        maxCount: 8,
      },
    ],
    enabled: true,
    nodeSelectors: [],
    tolerations: [],
    description: 'A test profile',
  },
};

describe('HardwareProfileDetailsPopover', () => {
  it('should render the trigger button without a question circle icon', () => {
    render(<HardwareProfileDetailsPopover hardwareProfile={mockHardwareProfile} />);
    const trigger = screen.getByTestId('hardware-profile-details-popover');
    expect(trigger).toHaveTextContent('View details');
    expect(trigger.querySelector('svg')).not.toBeInTheDocument();
  });

  it('should render "View details" label when not in table view', () => {
    render(<HardwareProfileDetailsPopover hardwareProfile={mockHardwareProfile} />);
    expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
      'View details',
    );
  });

  it('should render profile display name as label in table view', () => {
    render(<HardwareProfileDetailsPopover hardwareProfile={mockHardwareProfile} tableView />);
    expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
      'Test Profile',
    );
  });

  it('should render "No hardware profile" label in table view without a profile', () => {
    render(<HardwareProfileDetailsPopover tableView />);
    expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
      'No hardware profile',
    );
  });

  it('should show the popover with profile details when trigger is clicked', () => {
    render(<HardwareProfileDetailsPopover hardwareProfile={mockHardwareProfile} />);
    fireEvent.click(screen.getByTestId('hardware-profile-details-popover'));
    expect(screen.getByTestId('hardware-profile-details')).toBeInTheDocument();
    expect(screen.getByText('Test Profile details')).toBeInTheDocument();
    expect(screen.getByText('A test profile')).toBeInTheDocument();
    expect(screen.getByText('CPU')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
  });
});

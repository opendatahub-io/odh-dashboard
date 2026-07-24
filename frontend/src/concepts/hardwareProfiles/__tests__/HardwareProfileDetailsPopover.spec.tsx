import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { IdentifierResourceType, SchedulingType } from '@odh-dashboard/k8s-core';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import HardwareProfileDetailsPopover from '#~/concepts/hardwareProfiles/HardwareProfileDetailsPopover';

const renderWithContext = (ui: React.ReactElement) =>
  render(
    <ProjectDetailsContext.Provider
      value={
        {
          currentProject: { metadata: { name: 'test-project' } },
          localQueues: DEFAULT_LIST_FETCH_STATE,
        } as unknown as ProjectDetailsContextType
      }
    >
      {ui}
    </ProjectDetailsContext.Provider>,
  );

describe('HardwareProfileDetailsPopover', () => {
  describe('with a matched hardware profile', () => {
    it('should display the profile name in the popover trigger button', () => {
      const profile = mockHardwareProfile({
        displayName: 'Test Profile',
      });

      renderWithContext(<HardwareProfileDetailsPopover hardwareProfile={profile} tableView />);

      expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
        'Test Profile',
      );
    });

    it('should display identifier details in the popover body', async () => {
      const profile = mockHardwareProfile({
        displayName: 'Test Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '1',
            maxCount: '4',
            defaultCount: '2',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '8Gi',
            defaultCount: '4Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
        ],
      });

      renderWithContext(<HardwareProfileDetailsPopover hardwareProfile={profile} />);

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent('CPU');
      expect(details).toHaveTextContent('Default = 2 Cores, Min = 1 Cores, Max = 4 Cores');
      expect(details).toHaveTextContent('Memory');
      expect(details).toHaveTextContent('Default = 4 GiB, Min = 2 GiB, Max = 8 GiB');
    });

    it('should display "View details" text in form view (non-tableView)', () => {
      const profile = mockHardwareProfile({ displayName: 'Test Profile' });

      renderWithContext(<HardwareProfileDetailsPopover hardwareProfile={profile} />);

      expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
        'View details',
      );
    });
  });

  describe('no hardware profile', () => {
    it('should display "View details" trigger and fallback message in non-tableView mode', async () => {
      renderWithContext(<HardwareProfileDetailsPopover />);

      expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
        'View details',
      );

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      expect(screen.getByText('Existing settings')).toBeInTheDocument();
      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent(
        'No matching hardware profile found, using existing settings. Default, min, and max values are not available.',
      );
      expect(details.querySelectorAll('dl')).toHaveLength(0);
    });

    it('should display "No hardware profile" trigger and updated header/body in tableView mode', async () => {
      renderWithContext(<HardwareProfileDetailsPopover tableView />);

      expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
        'No hardware profile',
      );

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      expect(screen.getByText('No hardware profile defined')).toBeInTheDocument();
      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent('No hardware profile is defined for this workbench');
      expect(details.querySelectorAll('dl')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: 'Expand row' })).not.toBeInTheDocument();
    });

    it('should call onExpandRow when "Expand row" footer button is clicked', async () => {
      const onExpandRow = jest.fn();
      renderWithContext(<HardwareProfileDetailsPopover tableView onExpandRow={onExpandRow} />);

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));
      await userEvent.click(screen.getByRole('button', { name: 'Expand row' }));

      expect(onExpandRow).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduling details', () => {
    it('should display local queue and workload priority when provided', async () => {
      const profile = mockHardwareProfile({
        displayName: 'Queue Profile',
        schedulingType: SchedulingType.QUEUE,
        localQueueName: 'test-queue',
        priorityClass: 'high-priority',
      });

      renderWithContext(
        <HardwareProfileDetailsPopover
          hardwareProfile={profile}
          localQueueName="test-queue"
          priorityClass="high-priority"
        />,
      );

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent('Local queue');
      expect(details).toHaveTextContent('test-queue');
      expect(details).toHaveTextContent('Workload priority');
      expect(details).toHaveTextContent('high-priority');
    });

    it('should show "Local queue" label', async () => {
      renderWithContext(<HardwareProfileDetailsPopover localQueueName="test-queue" />);

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent('Local queue');
      expect(details).toHaveTextContent('test-queue');
      expect(details).not.toHaveTextContent('No matching hardware profile found');
    });
  });
});

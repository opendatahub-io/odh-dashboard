import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { IdentifierResourceType, SchedulingType } from '#~/types';
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
      expect(details).toHaveTextContent('Default = 2 Cores | Min = 1 Cores | Max = 4 Cores');
      expect(details).toHaveTextContent('Memory');
      expect(details).toHaveTextContent('Default = 4 GiB | Min = 2 GiB | Max = 8 GiB');
    });

    it('should display "View details" text in form view (non-tableView)', () => {
      const profile = mockHardwareProfile({ displayName: 'Test Profile' });

      renderWithContext(<HardwareProfileDetailsPopover hardwareProfile={profile} />);

      expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
        'View details',
      );
    });
  });

  describe('Custom scenario (no hardware profile)', () => {
    it('should display informational message in popover body', async () => {
      renderWithContext(<HardwareProfileDetailsPopover />);

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent(
        'No matching hardware profile found, using existing settings. Default, min, and max values are not available.',
      );
    });

    it('should display "View details" text in form view', () => {
      renderWithContext(<HardwareProfileDetailsPopover />);

      expect(screen.getByTestId('hardware-profile-details-popover')).toHaveTextContent(
        'View details',
      );
    });

    it('should not display fallback resource values', async () => {
      renderWithContext(<HardwareProfileDetailsPopover />);

      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const details = screen.getByTestId('hardware-profile-details');
      expect(details).not.toHaveTextContent('Request');
      expect(details).not.toHaveTextContent('Limit');
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
  });
});

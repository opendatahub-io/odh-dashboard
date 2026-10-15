import * as React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  k8sGetResource,
  k8sListResource,
  k8sListResourceItems,
  useK8sWatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { IdentifierResourceType, SchedulingType, type Identifier } from '@odh-dashboard/k8s-core';
import { DEFAULT_LIST_FETCH_STATE } from '@odh-dashboard/ui-core/utilities/fetchState';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import HardwareProfileDetailsPopover from '#~/concepts/hardwareProfiles/HardwareProfileDetailsPopover';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
  k8sListResourceItems: jest.fn(),
  useK8sWatchResource: jest.fn(),
}));

const renderWithContext = (ui: React.ReactElement) =>
  render(
    <LocalQueuesContext.Provider value={{ localQueues: DEFAULT_LIST_FETCH_STATE }}>
      {ui}
    </LocalQueuesContext.Provider>,
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

  describe('DRA claim template', () => {
    const dra = { resourceClaimTemplateName: 'single-mig-partition' };
    const descriptionAnnotation = 'opendatahub.io/resource-claim-description';

    const openPopover = async (
      annotations?: Record<string, string>,
      identifiers?: Identifier[],
    ) => {
      renderWithContext(
        <HardwareProfileDetailsPopover
          hardwareProfile={mockHardwareProfile({
            displayName: 'DRA Profile',
            dra,
            annotations,
            identifiers,
          })}
        />,
      );
      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));
    };

    const openResourceNamePopover = async () => {
      await userEvent.click(
        within(screen.getByTestId('hardware-profile-dra-details')).getByTestId(
          'resource-name-icon-button',
        ),
      );
      await screen.findByTestId('resource-name-text');
    };

    it('should display the claim template name without the description', async () => {
      await openPopover({
        [descriptionAnnotation]: 'Requests one partitioned GPU device for the workload.',
      });

      const draDetails = screen.getByTestId('hardware-profile-dra-details');
      expect(draDetails).toHaveTextContent('Claim template');
      expect(draDetails).not.toHaveTextContent('Device requests');
      expect(within(draDetails).getByRole('term')).toHaveTextContent('Claim template Tech Preview');
      expect(screen.getByTestId('hardware-profile-dra-template')).toHaveTextContent(
        'single-mig-partition',
      );
      expect(screen.getByTestId('hardware-profile-dra-template')).not.toHaveTextContent(
        'Tech Preview',
      );
      expect(draDetails).not.toHaveTextContent(
        'Requests one partitioned GPU device for the workload.',
      );
      const details = screen.getByTestId('hardware-profile-details');
      expect(details).toHaveTextContent('Default = 2 GiB, Min = 2 GiB, Max = 5 GiB');
      expect(details).toHaveTextContent('Default = 1 Cores, Min = 1 Cores, Max = 2 Cores');
    });

    it('should show the claim template resource name and type in a nested popover', async () => {
      await openPopover();

      await userEvent.click(
        within(screen.getByTestId('hardware-profile-dra-details')).getByTestId(
          'resource-name-icon-button',
        ),
      );

      expect(await screen.findByTestId('resource-name-text')).toHaveTextContent(
        'single-mig-partition',
      );
      expect(screen.getByTestId('resource-kind-text')).toHaveTextContent('ResourceClaimTemplate');
      expect(screen.queryByTestId('resource-description-text')).not.toBeInTheDocument();

      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.click(screen.getByTestId('resource-kind-text'));
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      jest.useRealTimers();

      expect(screen.getByTestId('hardware-profile-details')).toBeInTheDocument();
    });

    it('should show the claim template description in the resource name popover', async () => {
      await openPopover({ [descriptionAnnotation]: 'Requests one GPU for the workload.' });

      await userEvent.click(
        within(screen.getByTestId('hardware-profile-dra-details')).getByTestId(
          'resource-name-icon-button',
        ),
      );

      expect(await screen.findByTestId('resource-description-text')).toHaveTextContent(
        'Requests one GPU for the workload.',
      );
    });

    it('should still close on Escape', async () => {
      await openPopover();

      await userEvent.keyboard('{Escape}');

      await waitFor(() =>
        expect(screen.queryByTestId('hardware-profile-details')).not.toBeInTheDocument(),
      );
    });

    it('should render the DRA details for a profile without identifiers', async () => {
      await openPopover(undefined, []);

      expect(screen.getByTestId('hardware-profile-dra-template')).toHaveTextContent(
        'single-mig-partition',
      );
      expect(screen.getByTestId('hardware-profile-details')).not.toHaveTextContent(
        'No matching hardware profile found',
      );
    });

    it('should omit the resource description when the annotation is missing', async () => {
      await openPopover();
      await openResourceNamePopover();

      expect(screen.queryByTestId('resource-description-text')).not.toBeInTheDocument();
    });

    it.each(['', '  \n\t  '])(
      'should omit the resource description when the annotation is %j',
      async (value) => {
        await openPopover({ [descriptionAnnotation]: value });
        await openResourceNamePopover();

        expect(screen.queryByTestId('resource-description-text')).not.toBeInTheDocument();
      },
    );

    it('should put a long description in the resource name popover', async () => {
      const longText = 'Requests one partitioned GPU device for the workload. '.repeat(20).trim();
      await openPopover({ [descriptionAnnotation]: longText });

      await openResourceNamePopover();

      expect(screen.getByTestId('resource-description-text').textContent).toBe(longText);
    });

    it('should truncate a long claim template name and show it in full in a tooltip', async () => {
      const longName = `${'partitioned-accelerator-'.repeat(8)}template`;
      renderWithContext(
        <HardwareProfileDetailsPopover
          hardwareProfile={mockHardwareProfile({
            displayName: 'DRA Profile',
            dra: { resourceClaimTemplateName: longName },
          })}
        />,
      );
      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      const template = screen.getByTestId('hardware-profile-dra-template');
      expect(template).toHaveTextContent('…');

      await userEvent.hover(template);

      expect(await screen.findByRole('tooltip')).toHaveTextContent(longName);
    });

    it.each([
      ['20', 'single-mig-partition', false],
      ['30', 'a'.repeat(30), false],
      ['31', 'a'.repeat(31), true],
    ])(
      'should truncate a %s-character claim template name: %s',
      async (_, resourceClaimTemplateName, isTruncated) => {
        renderWithContext(
          <HardwareProfileDetailsPopover
            hardwareProfile={mockHardwareProfile({
              displayName: 'DRA Profile',
              dra: { resourceClaimTemplateName },
            })}
          />,
        );
        await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

        const template = screen.getByTestId('hardware-profile-dra-template');
        await userEvent.hover(template);

        if (isTruncated) {
          expect(template).toHaveTextContent('…');
          expect(await screen.findByRole('tooltip')).toHaveTextContent(resourceClaimTemplateName);
        } else {
          expect(template.textContent).toBe(resourceClaimTemplateName);
          expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        }
      },
    );

    it('should collapse a multi-line description into one line', async () => {
      await openPopover({ [descriptionAnnotation]: 'Line one\nLine two\n\nLine three' });
      await openResourceNamePopover();

      expect(screen.getByTestId('resource-description-text').textContent).toBe(
        'Line one Line two Line three',
      );
    });

    it('should render markup in the description as plain text', async () => {
      await openPopover({ [descriptionAnnotation]: '<b>x</b>' });
      await openResourceNamePopover();

      const description = screen.getByTestId('resource-description-text');
      expect(description.textContent).toBe('<b>x</b>');
      expect(description.querySelector('b')).toBeNull();
    });

    it('should not fetch the ResourceClaimTemplate or any ResourceClaim', async () => {
      await openPopover({ [descriptionAnnotation]: 'Some description' });

      expect(screen.getByTestId('hardware-profile-dra-details')).toBeInTheDocument();
      expect(k8sGetResource).not.toHaveBeenCalled();
      expect(k8sListResource).not.toHaveBeenCalled();
      expect(k8sListResourceItems).not.toHaveBeenCalled();
      expect(useK8sWatchResource).not.toHaveBeenCalled();
    });

    it('should not render DRA details for a non-DRA profile', async () => {
      renderWithContext(
        <HardwareProfileDetailsPopover
          hardwareProfile={mockHardwareProfile({
            displayName: 'Plain Profile',
            annotations: { [descriptionAnnotation]: 'Ignored without spec.dra' },
          })}
        />,
      );
      await userEvent.click(screen.getByTestId('hardware-profile-details-popover'));

      expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
      const details = screen.getByTestId('hardware-profile-details');
      expect(details).not.toHaveTextContent('Claim template');
      expect(details).not.toHaveTextContent('Ignored without spec.dra');
      expect(details).toHaveTextContent('Default = 1 Cores, Min = 1 Cores, Max = 2 Cores');
    });
  });
});

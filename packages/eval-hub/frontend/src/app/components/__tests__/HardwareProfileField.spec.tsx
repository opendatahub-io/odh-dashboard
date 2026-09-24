/* eslint-disable camelcase */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import HardwareProfileField from '~/app/components/HardwareProfileField';
import type { HardwareProfile, KueueAvailability } from '~/app/types';

const availability: KueueAvailability = {
  enabled: true,
  scheduling_ready: true,
  cluster_enabled: true,
  namespace_managed: true,
  local_queues_available: true,
  local_queue_names: ['gpu-default'],
};

const profile: HardwareProfile = {
  name: 'gpu-small',
  display_name: 'GPU Small',
  enabled: true,
  local_queue_name: 'gpu-default',
  resources: [{ identifier: 'nvidia.com/gpu', display_name: 'GPU', default: '1' }],
};

describe('HardwareProfileField', () => {
  it('shows a field skeleton while Kueue and HardwareProfiles are loading', () => {
    render(<HardwareProfileField profiles={[]} loaded={false} onSelect={jest.fn()} />);

    expect(screen.getByTestId('hardware-profile-skeleton')).toBeInTheDocument();
    expect(screen.getByText('Hardware profile')).toBeInTheDocument();
    expect(screen.queryByTestId('hardware-profile-select')).not.toBeInTheDocument();
  });

  it('renders queue-compatible profiles and reports the selection', () => {
    const onSelect = jest.fn();
    render(
      <HardwareProfileField
        availability={availability}
        profiles={[profile]}
        loaded
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Hardware profile')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hardware-profile-toggle'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('GPU Small'));

    expect(onSelect).toHaveBeenCalledWith(profile);
  });

  it('labels an insufficient profile without disabling its selection', () => {
    const insufficientProfile: HardwareProfile = {
      ...profile,
      compatibility: {
        compatible: false,
        hardware_profile: profile.name,
        mismatches: [],
      },
    };
    const onSelect = jest.fn();
    render(
      <HardwareProfileField
        availability={availability}
        profiles={[insufficientProfile]}
        loaded
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('hardware-profile-toggle'));

    expect(screen.getByTestId(`hardware-profile-insufficient-${profile.name}`)).toHaveTextContent(
      'Insufficient resources',
    );
    fireEvent.click(within(screen.getByRole('listbox')).getByText('GPU Small'));
    expect(onSelect).toHaveBeenCalledWith(insufficientProfile);
  });

  it('marks the HardwareProfile as required without adding redundant helper text', () => {
    const { container } = render(
      <HardwareProfileField
        availability={availability}
        profiles={[profile]}
        loaded
        isRequired
        onSelect={jest.fn()}
      />,
    );

    expect(container.querySelector('.pf-v6-c-form__label-required')).toHaveTextContent('*');
    expect(
      screen.queryByText('Select a hardware profile to schedule this evaluation through Kueue.'),
    ).not.toBeInTheDocument();
  });

  it('describes the selected resources and LocalQueue', () => {
    render(
      <HardwareProfileField
        availability={availability}
        profiles={[
          {
            ...profile,
            resources: [
              {
                identifier: 'cpu',
                display_name: 'CPU',
                default: '4',
                minimum: '2',
                maximum: '8',
              },
              {
                identifier: 'memory',
                display_name: 'Memory',
                default: '16Gi',
                maximum: '32Gi',
              },
            ],
          },
        ]}
        loaded
        selectedProfile={profile.name}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hardware-profile-details')).toHaveTextContent(
      'CPU: Default = 4, Minimum = 2, Maximum = 8; Memory: Default = 16Gi, Maximum = 32Gi; LocalQueue: gpu-default',
    );
    expect(screen.getByTestId('hardware-profile-kueue-info')).toHaveTextContent(
      'Only hardware profiles configured with a local queue are shown because this project uses Kueue for workload scheduling.',
    );
    expect(
      screen.queryByText('Select the compute resources and Kueue LocalQueue for this evaluation.'),
    ).not.toBeInTheDocument();
    const helpTrigger = screen.getByLabelText('More info for hardware profile');
    expect(helpTrigger).toBeInTheDocument();
    fireEvent.click(helpTrigger);
    expect(
      screen.getByRole('dialog', { name: 'More info for hardware profile' }),
    ).toHaveTextContent(
      'Selecting a hardware profile allows you to match the hardware requirements of your workload to available node resources.',
    );
  });

  it('shows the selected hardware profile details in a popover', () => {
    render(
      <HardwareProfileField
        availability={availability}
        profiles={[
          {
            ...profile,
            display_name: 'Kueue GPU Profile',
            description: 'GPU profile with queue scheduling.',
            cluster_queue_name: 'gpu-cluster',
            resources: [
              {
                identifier: 'cpu',
                display_name: 'CPU',
                default: '4',
                minimum: '2',
                maximum: '8',
              },
              {
                identifier: 'memory',
                display_name: 'Memory',
                default: '16Gi',
                minimum: '8Gi',
                maximum: '32Gi',
              },
            ],
          },
        ]}
        loaded
        selectedProfile={profile.name}
        onSelect={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('hardware-profile-details-popover'));

    expect(screen.getByText('Kueue GPU Profile details')).toBeInTheDocument();
    const details = screen.getByTestId('hardware-profile-details-popover-content');
    expect(details).toHaveTextContent('GPU profile with queue scheduling.');
    expect(details).toHaveTextContent('Default = 4 Cores, Min = 2 Cores, Max = 8 Cores');
    expect(details).toHaveTextContent('Default = 16 GiB, Min = 8 GiB, Max = 32 GiB');
    expect(details).toHaveTextContent('Local queuegpu-default');
    expect(details).toHaveTextContent('Cluster queuegpu-cluster');
  });

  it('allows the selected HardwareProfile to be cleared', () => {
    const onSelect = jest.fn();
    render(
      <HardwareProfileField
        availability={availability}
        profiles={[profile]}
        loaded
        selectedProfile={profile.name}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('hardware-profile-toggle'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('No hardware profile'));

    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it('stays hidden when Kueue is unavailable', () => {
    render(
      <HardwareProfileField
        availability={{
          ...availability,
          enabled: false,
          scheduling_ready: false,
          namespace_managed: false,
        }}
        profiles={[]}
        loaded
        onSelect={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('hardware-profile-select')).not.toBeInTheDocument();
  });

  it('explains when a managed namespace has no LocalQueues', () => {
    render(
      <HardwareProfileField
        availability={{
          ...availability,
          scheduling_ready: false,
          local_queues_available: false,
          local_queue_names: [],
        }}
        profiles={[]}
        loaded
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hardware-profile-toggle')).toBeDisabled();
    expect(
      screen.getByText(
        /No LocalQueues are configured for this project. An evaluation cannot start/,
      ),
    ).toBeInTheDocument();
  });

  it('explains when Kueue is available but no compatible profiles are configured', () => {
    render(
      <HardwareProfileField
        availability={availability}
        profiles={[]}
        loaded
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hardware-profile-toggle')).toBeDisabled();
    expect(
      screen.getByText(
        /No compatible hardware profiles are configured for this project. An evaluation cannot start/,
      ),
    ).toBeInTheDocument();
  });

  it('shows an error when loading Kueue or HardwareProfiles fails', () => {
    render(
      <HardwareProfileField
        profiles={[]}
        loaded
        error={new Error('Unable to load HardwareProfiles')}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hardware-profile-toggle')).toBeDisabled();
    expect(
      screen.getByText(
        'Unable to load HardwareProfiles Resolve this error before starting an evaluation.',
      ),
    ).toBeInTheDocument();
  });

  it('warns without disabling the field when resource compatibility cannot be checked', () => {
    render(
      <HardwareProfileField
        availability={availability}
        profiles={[profile]}
        loaded
        compatibilityError={new Error('Compatibility unavailable')}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('hardware-profile-toggle')).toBeEnabled();
    expect(screen.getByText(/Resource recommendations could not be checked/)).toBeInTheDocument();
  });
});

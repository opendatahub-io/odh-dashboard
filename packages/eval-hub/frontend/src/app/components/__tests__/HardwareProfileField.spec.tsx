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

  it('explains that a HardwareProfile is required for Kueue scheduling', () => {
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
      screen.getByText('Select a hardware profile to schedule this evaluation through Kueue.'),
    ).toBeInTheDocument();
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
    expect(
      screen.queryByText('Only queue-backed HardwareProfiles are shown for this project.'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('More info for hardware profile')).toBeInTheDocument();
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
});

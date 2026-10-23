import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { InfrastructureWorkloadsLink } from '#~/pages/distributedWorkloads/global/GlobalDistributedWorkloads';

const NavigationState = () => {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
};

describe('InfrastructureWorkloadsLink', () => {
  it.each([
    { infrastructureAvailable: true, shouldLink: true },
    { infrastructureAvailable: false, shouldLink: false },
  ])(
    'should render Workloads correctly when Infrastructure availability is $infrastructureAvailable',
    ({ infrastructureAvailable, shouldLink }) => {
      render(
        <MemoryRouter>
          <InfrastructureWorkloadsLink infrastructureAvailable={infrastructureAvailable} />
          <NavigationState />
        </MemoryRouter>,
      );

      const link = screen.queryByRole('link', { name: 'Workloads' });

      if (shouldLink) {
        expect(link).toHaveAttribute('href', '/observe-and-monitor/infrastructure');
        fireEvent.click(screen.getByRole('link', { name: 'Workloads' }));
        expect(screen.getByRole('status')).toHaveTextContent('{"tab":"workloads"}');
      } else {
        expect(link).not.toBeInTheDocument();
        expect(screen.getByText('Workloads')).toBeInTheDocument();
      }
    },
  );
});

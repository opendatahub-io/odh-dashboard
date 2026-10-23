import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InfrastructureWorkloadsLink } from '#~/pages/distributedWorkloads/global/GlobalDistributedWorkloads';

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
        </MemoryRouter>,
      );

      const link = screen.queryByRole('link', { name: 'Workloads' });

      if (shouldLink) {
        expect(link).toHaveAttribute('href', '/observe-and-monitor/infrastructure');
      } else {
        expect(link).not.toBeInTheDocument();
        expect(screen.getByText('Workloads')).toBeInTheDocument();
      }
    },
  );
});

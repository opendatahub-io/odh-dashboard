import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CallerOrganizationContext, GroupName, groupLabel } from '~/app/shared/GroupName';

const organization = { id: '42c3e46f-2477-44d7-a85b-d3b43f6b31fa', name: 'Grid Tenant 1' };

describe('GroupName', () => {
  it("shows a group of the caller's organization by the organization's name, with its id to copy", async () => {
    render(
      <CallerOrganizationContext.Provider value={organization}>
        <GroupName name={`${organization.id}/ai-grid-users`} />
      </CallerOrganizationContext.Provider>,
    );
    expect(screen.getByTestId('group-name')).toHaveTextContent('Grid Tenant 1/ai-grid-users');
    expect(screen.queryByText(organization.id)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Grid Tenant 1' }));
    expect(await screen.findByText('Organization ID')).toBeInTheDocument();
    expect(screen.getByText(organization.id)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy organization ID' })).toBeInTheDocument();
  });

  it('shows any other group, and every group without an organization, as it is', () => {
    const { rerender } = render(
      <CallerOrganizationContext.Provider value={organization}>
        <GroupName name="other-org-id/ai-grid-users" />
      </CallerOrganizationContext.Provider>,
    );
    expect(screen.getByText('other-org-id/ai-grid-users')).toBeInTheDocument();
    rerender(<GroupName name={`${organization.id}/ai-grid-users`} />);
    expect(screen.getByText(`${organization.id}/ai-grid-users`)).toBeInTheDocument();
  });

  it('labels a filter option by the organization name and leaves others unchanged', () => {
    expect(groupLabel(`${organization.id}/ai-grid-users`, organization)).toBe(
      'Grid Tenant 1/ai-grid-users',
    );
    expect(groupLabel('premium-users', organization)).toBe('premium-users');
    expect(groupLabel(`${organization.id}/ai-grid-users`, undefined)).toBe(
      `${organization.id}/ai-grid-users`,
    );
  });
});

import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import type { RoleRef } from '#~/concepts/permissions/types';
import { RoleLabelType } from '#~/concepts/permissions/types';
import RoleRefSelect from '#~/pages/projects/projectPermissions/components/RoleRefSelect';
import { DEFAULT_ROLE_DESCRIPTIONS } from '#~/pages/projects/projectPermissions/const';

const mockUsePermissionsContext = jest.fn();

jest.mock('#~/concepts/permissions/PermissionsContext', () => ({
  usePermissionsContext: () => mockUsePermissionsContext(),
}));

let mockLastSimpleSelectProps: Record<string, unknown> | undefined;

jest.mock('#~/components/SimpleSelect', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockLastSimpleSelectProps = props;
    const options = (props.options ?? []) as Array<{
      key: string;
      dropdownLabel?: React.ReactNode;
      label?: string;
    }>;
    return (
      <div data-testid={String(props.dataTestId ?? 'simple-select')}>
        <div data-testid="toggle-label">{props.toggleLabel as React.ReactNode}</div>
        <div data-testid="options">
          {options.map((o) => (
            <div key={o.key} data-testid={`opt-${o.key}`}>
              {o.dropdownLabel ?? o.label}
            </div>
          ))}
        </div>
      </div>
    );
  },
  SimpleSelectOption: {},
}));

// Keep the output inspectable without PF complexity
jest.mock('@patternfly/react-core', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Flex: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FlexItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('#~/pages/projects/projectPermissions/components/RoleLabel', () => ({
  __esModule: true,
  default: ({ type }: { type?: RoleLabelType }) => (
    <span data-testid="role-label" data-type={type ?? ''} />
  ),
}));

describe('RoleRefSelect', () => {
  const admin: RoleRef = { kind: 'ClusterRole', name: 'admin' };
  const edit: RoleRef = { kind: 'ClusterRole', name: 'edit' };
  const view: RoleRef = { kind: 'ClusterRole', name: 'view' };

  beforeEach(() => {
    mockLastSimpleSelectProps = undefined;
    mockUsePermissionsContext.mockReset();
    // Simulate "cluster roles not listable": no role objects available
    mockUsePermissionsContext.mockReturnValue({
      roles: { data: [] },
      clusterRoles: { data: [] },
    });
  });

  it('renders friendly labels for default cluster roles when role objects are unavailable', () => {
    render(
      <RoleRefSelect
        availableRoles={[admin, edit, view]}
        value={admin}
        isDisabled={false}
        onChange={() => undefined}
        dataTestId="role-ref-select"
      />,
    );

    // Toggle label renders the selected role
    expect(within(screen.getByTestId('toggle-label')).getByText('Admin')).toBeInTheDocument();

    // Options list renders all available roles
    expect(
      within(screen.getByTestId('opt-ClusterRole:admin')).getByText('Admin'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opt-ClusterRole:edit')).getByText('Contributor'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opt-ClusterRole:view')).getByText('view'),
    ).toBeInTheDocument();
  });

  it('applies fallback label types when role objects are unavailable (admin/edit default, other cluster roles custom)', () => {
    render(
      <RoleRefSelect
        availableRoles={[admin, edit, view]}
        value={admin}
        isDisabled={false}
        onChange={() => undefined}
        dataTestId="role-ref-select"
      />,
    );

    const labels = screen.getAllByTestId('role-label');
    // One label in toggle + one per option; we only care that defaults/custom appear somewhere
    expect(labels.some((n) => n.getAttribute('data-type') === RoleLabelType.OpenshiftDefault)).toBe(
      true,
    );
    expect(labels.some((n) => n.getAttribute('data-type') === RoleLabelType.OpenshiftCustom)).toBe(
      true,
    );
  });

  it('disables options already assigned to the subject', () => {
    render(
      <RoleRefSelect
        availableRoles={[admin, edit]}
        assignedRoles={[edit]}
        value={admin}
        isDisabled={false}
        onChange={() => undefined}
        dataTestId="role-ref-select"
      />,
    );

    const options = (mockLastSimpleSelectProps?.options ?? []) as Array<{
      key: string;
      isDisabled?: boolean;
    }>;
    const byKey = new Map(options.map((o) => [o.key, o]));
    expect(byKey.get('ClusterRole:edit')?.isDisabled).toBe(true);
    expect(byKey.get('ClusterRole:admin')?.isDisabled).toBe(false);
  });

  it('uses DEFAULT_ROLE_DESCRIPTIONS for admin/edit descriptions', () => {
    render(
      <RoleRefSelect
        availableRoles={[admin, edit]}
        value={admin}
        isDisabled={false}
        onChange={() => undefined}
        dataTestId="role-ref-select"
      />,
    );

    const options = (mockLastSimpleSelectProps?.options ?? []) as Array<{
      key: string;
      description?: string;
    }>;
    const byKey = new Map(options.map((o) => [o.key, o]));
    expect(byKey.get('ClusterRole:admin')?.description).toBe(
      DEFAULT_ROLE_DESCRIPTIONS['ClusterRole:admin'],
    );
    expect(byKey.get('ClusterRole:edit')?.description).toBe(
      DEFAULT_ROLE_DESCRIPTIONS['ClusterRole:edit'],
    );
  });
});

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import YAML from 'yaml';
import { KnownLabels } from '#~/k8sTypes';
import CreateRoleYamlView from '#~/pages/projects/projectRoles/CreateRoleYamlView';
import type { RuleEntry } from '#~/pages/projects/projectRoles/types';

jest.mock('#~/concepts/dashboard/codeEditor/DashboardCodeEditor', () => {
  const MockEditor: React.FC<{
    code: string;
    testId?: string;
    isReadOnly?: boolean;
    customControls?: React.ReactNode;
  }> = ({ code, testId, isReadOnly, customControls }) => (
    <div data-testid={testId} data-readonly={isReadOnly}>
      <pre>{code}</pre>
      {customControls}
    </div>
  );
  MockEditor.displayName = 'DashboardCodeEditor';
  return { __esModule: true, default: MockEditor };
});

describe('CreateRoleYamlView', () => {
  const defaultProps = {
    namespace: 'test-ns',
    k8sName: 'my-role',
    displayName: 'My Role',
    description: 'A test role',
    rules: [] as RuleEntry[],
    labels: [],
  };

  it('should render the title and description', () => {
    render(<CreateRoleYamlView {...defaultProps} />);

    expect(screen.getByTestId('yaml-view-title')).toHaveTextContent('Role configuration YAML');
    expect(screen.getByTestId('yaml-view-description')).toBeInTheDocument();
    expect(screen.getByText(/View the live, read-only YAML for this role/)).toBeInTheDocument();
  });

  it('should render a valid Kubernetes Role YAML', () => {
    render(<CreateRoleYamlView {...defaultProps} />);

    expect(screen.getByTestId('yaml-code-editor')).toHaveAttribute('data-readonly', 'true');

    const editorContent = screen.getByTestId('yaml-code-editor').querySelector('pre')?.textContent;
    const parsed = YAML.parse(editorContent ?? '');

    expect(parsed).toMatchObject({
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'Role',
      metadata: {
        name: 'my-role',
        namespace: 'test-ns',
        labels: {
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        },
        annotations: {
          'openshift.io/display-name': 'My Role',
          'openshift.io/description': 'A test role',
        },
      },
      rules: [],
    });
  });

  it('should reflect rules in YAML output', () => {
    const rules: RuleEntry[] = [
      {
        id: 'rule-1',
        verbs: ['get', 'list'],
        apiGroups: [''],
        resources: ['pods'],
      },
    ];

    render(<CreateRoleYamlView {...defaultProps} rules={rules} />);

    const editorContent = screen.getByTestId('yaml-code-editor').querySelector('pre')?.textContent;
    const parsed = YAML.parse(editorContent ?? '');

    expect(parsed.rules).toStrictEqual([
      { verbs: ['get', 'list'], apiGroups: [''], resources: ['pods'] },
    ]);
  });

  it('should reflect labels in YAML output', () => {
    const labels = [
      { id: 'l1', key: 'team', value: 'platform' },
      { id: 'l2', key: 'env', value: 'prod' },
    ];

    render(<CreateRoleYamlView {...defaultProps} labels={labels} />);

    const editorContent = screen.getByTestId('yaml-code-editor').querySelector('pre')?.textContent;
    const parsed = YAML.parse(editorContent ?? '');

    expect(parsed.metadata.labels).toMatchObject({
      team: 'platform',
      env: 'prod',
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    });
  });

  it('should show empty name when k8sName is empty', () => {
    render(<CreateRoleYamlView {...defaultProps} k8sName="" displayName="" />);

    const editorContent = screen.getByTestId('yaml-code-editor').querySelector('pre')?.textContent;
    const parsed = YAML.parse(editorContent ?? '');

    expect(parsed.metadata.name).toBe('');
  });

  it('should render the full-screen toggle button', () => {
    render(<CreateRoleYamlView {...defaultProps} />);

    expect(screen.getByTestId('yaml-fullscreen-toggle')).toBeInTheDocument();
  });

  it('should filter out labels with empty keys', () => {
    const labels = [
      { id: 'l1', key: '', value: 'ignored' },
      { id: 'l2', key: 'valid', value: 'kept' },
    ];

    render(<CreateRoleYamlView {...defaultProps} labels={labels} />);

    const editorContent = screen.getByTestId('yaml-code-editor').querySelector('pre')?.textContent;
    const parsed = YAML.parse(editorContent ?? '');

    expect(parsed.metadata.labels).toMatchObject({
      valid: 'kept',
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    });
    expect(Object.keys(parsed.metadata.labels)).not.toContain('');
  });
});

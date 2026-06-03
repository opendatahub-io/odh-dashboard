import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteAuthPolicyModal from '~/app/pages/auth-policies/DeleteAuthPolicyModal';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';

jest.mock('~/app/hooks/useDeleteAuthPolicy', () => ({
  useDeleteAuthPolicy: () => ({
    isDeleting: false,
    error: undefined,
    deleteAuthPolicyCallback: jest.fn(),
  }),
}));

const mockAuthPolicy = (overrides: Partial<MaaSAuthPolicy> = {}): MaaSAuthPolicy => ({
  name: 'prod-policy',
  namespace: 'test-ns',
  modelRefs: [],
  subjects: {},
  ...overrides,
});

describe('DeleteAuthPolicyModal', () => {
  it('should display displayName when available', () => {
    render(
      <DeleteAuthPolicyModal
        authPolicy={mockAuthPolicy({ displayName: 'Production Policy' })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Production Policy')).toBeInTheDocument();
    expect(screen.queryByText('prod-policy')).not.toBeInTheDocument();
  });

  it('should fall back to name when displayName is not set', () => {
    render(
      <DeleteAuthPolicyModal authPolicy={mockAuthPolicy()} onClose={jest.fn()} />,
    );

    expect(screen.getByText('prod-policy')).toBeInTheDocument();
  });

  it('should fall back to name when displayName is empty string', () => {
    render(
      <DeleteAuthPolicyModal
        authPolicy={mockAuthPolicy({ displayName: '' })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('prod-policy')).toBeInTheDocument();
  });
});

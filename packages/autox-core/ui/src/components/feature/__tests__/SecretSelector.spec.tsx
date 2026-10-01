import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import type { SecretListItem } from '../../../api/k8s';
import { useSecretsQuery } from '../../../hooks';
import SecretSelector from '../SecretSelector';

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useSecretsQuery: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  TypeaheadSelect: ({
    dataTestId,
    isDisabled,
    onSelect,
    placeholder,
    selectOptions,
  }: {
    dataTestId?: string;
    isDisabled?: boolean;
    onSelect?: (_event: undefined, selection: string | number) => void;
    placeholder?: string;
    selectOptions: { content: string | number; value: string | number }[];
  }) => (
    <div>
      <button
        type="button"
        data-testid={dataTestId}
        disabled={isDisabled}
        onClick={() => onSelect?.(undefined, selectOptions[0]?.value ?? '')}
      >
        {placeholder}
      </button>
      {selectOptions.map((option) => (
        <span key={option.value}>{option.content}</span>
      ))}
    </div>
  ),
}));

const mockUseSecretsQuery = jest.mocked(useSecretsQuery);

const secrets: SecretListItem[] = [
  {
    uuid: 'valid',
    name: 'valid-secret',
    type: 'storage',
    data: { REQUIRED: 'value' },
  },
  {
    uuid: 'invalid',
    name: 'invalid-secret',
    type: 'storage',
    data: {},
  },
];

describe('SecretSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSecretsQuery.mockReturnValue({
      data: [],
      isPending: true,
      error: null,
      refetch: jest.fn(),
    } as never);
  });

  it('should show a skeleton while secrets are loading', () => {
    render(<SecretSelector namespace="test" onChange={jest.fn()} />);

    expect(document.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
  });

  it('should render fetched secrets and expose the refresh callback', () => {
    const refresh = jest.fn();
    const onRefreshReady = jest.fn();
    mockUseSecretsQuery.mockReturnValue({
      data: secrets,
      isPending: false,
      error: null,
      refetch: refresh,
    } as never);

    render(
      <SecretSelector namespace="test" onChange={jest.fn()} onRefreshReady={onRefreshReady} />,
    );

    expect(screen.getByText('valid-secret')).toBeInTheDocument();
    expect(onRefreshReady).toHaveBeenCalled();
  });

  it('should report an invalid selection when required keys are missing', () => {
    const onChange = jest.fn();
    mockUseSecretsQuery.mockReturnValue({
      data: secrets,
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    render(
      <SecretSelector
        namespace="test"
        onChange={onChange}
        additionalRequiredKeys={{ storage: ['REQUIRED'] }}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledWith({ ...secrets[0], invalid: false });
  });

  it('should show a validation message for a selected secret missing required keys', () => {
    mockUseSecretsQuery.mockReturnValue({
      data: secrets,
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    render(
      <SecretSelector
        namespace="test"
        value="invalid"
        onChange={jest.fn()}
        additionalRequiredKeys={{ storage: ['REQUIRED'] }}
      />,
    );

    expect(
      screen.getByText('Required key "REQUIRED" is not set in this secret'),
    ).toBeInTheDocument();
  });

  it('should format a plural validation message for multiple missing required keys', () => {
    const secret = { ...secrets[1], data: {} };
    mockUseSecretsQuery.mockReturnValue({
      data: [secret],
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    render(
      <SecretSelector
        namespace="test"
        value={secret.uuid}
        onChange={jest.fn()}
        additionalRequiredKeys={{ storage: ['ACCESS_KEY', 'SECRET_KEY'] }}
      />,
    );

    expect(
      screen.getByText('Required keys "ACCESS_KEY", "SECRET_KEY" are not set in this secret'),
    ).toBeInTheDocument();
  });

  it('should treat absent secret data as empty when validating a selection', () => {
    const onChange = jest.fn();
    const secret = { ...secrets[1], data: undefined };
    mockUseSecretsQuery.mockReturnValue({
      data: [secret],
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    render(
      <SecretSelector
        namespace="test"
        onChange={onChange}
        additionalRequiredKeys={{ storage: ['REQUIRED'] }}
      />,
    );
    fireEvent.click(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledWith({ ...secret, invalid: true });
    expect(
      screen.getByText('Required key "REQUIRED" is not set in this secret'),
    ).toBeInTheDocument();
  });

  it('should accept a selection when additional required keys are absent', () => {
    const onChange = jest.fn();
    mockUseSecretsQuery.mockReturnValue({
      data: [secrets[1]],
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    render(<SecretSelector namespace="test" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledWith({ ...secrets[1], invalid: false });
  });

  it('should accept selections when required-key maps are empty, missing, or do not contain the type', () => {
    const onChange = jest.fn();
    const secret = { ...secrets[1], type: 'nonstandard' };
    mockUseSecretsQuery.mockReturnValue({
      data: [secret],
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    const { rerender } = render(
      <SecretSelector namespace="test" onChange={onChange} additionalRequiredKeys={{}} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith({ ...secret, invalid: false });

    onChange.mockClear();
    rerender(
      <SecretSelector
        namespace="test"
        onChange={onChange}
        additionalRequiredKeys={{ storage: ['REQUIRED'] }}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith({ ...secret, invalid: false });
  });

  it('should reconcile valueName to the matching UUID and clear stale selections', async () => {
    const onChange = jest.fn();
    mockUseSecretsQuery.mockReturnValue({
      data: secrets,
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    const { rerender } = render(
      <SecretSelector namespace="test" valueName="valid-secret" onChange={onChange} />,
    );

    expect(screen.getByText('valid-secret')).toBeInTheDocument();
    mockUseSecretsQuery.mockReturnValue({
      data: [secrets[1]],
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    rerender(<SecretSelector namespace="test" valueName="valid-secret" onChange={onChange} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined));
  });

  it('should preserve a newly available valueName after a refreshed result', () => {
    const onChange = jest.fn();
    const refreshedSecret = { ...secrets[0], uuid: 'new-uuid', name: 'new-secret' };
    mockUseSecretsQuery.mockReturnValue({
      data: [refreshedSecret],
      isPending: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    render(<SecretSelector namespace="test" valueName="new-secret" onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalledWith(undefined);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith({ ...refreshedSecret, invalid: false });
  });
});

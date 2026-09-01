import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import { useAutoXApi } from '../../../context';
import type { SecretListItem } from '../../../api/k8s';
import SecretSelector from '../SecretSelector';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useFetchState: jest.fn(),
}));

jest.mock('../../../context', () => ({ useAutoXApi: jest.fn() }));

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

const mockUseFetchState = jest.mocked(useFetchState);
const mockUseAutoXApi = jest.mocked(useAutoXApi);

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
    mockUseAutoXApi.mockReturnValue({
      k8s: { getSecrets: jest.fn() },
    } as unknown as ReturnType<typeof useAutoXApi>);
  });

  it('should show a skeleton while secrets are loading', () => {
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);

    render(<SecretSelector namespace="test" onChange={jest.fn()} />);

    expect(document.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
  });

  it('should render fetched secrets and expose the refresh callback', () => {
    const refresh = jest.fn();
    const onRefreshReady = jest.fn();
    mockUseFetchState.mockReturnValue([secrets, true, undefined, refresh]);

    render(
      <SecretSelector namespace="test" onChange={jest.fn()} onRefreshReady={onRefreshReady} />,
    );

    expect(screen.getByText('valid-secret')).toBeInTheDocument();
    expect(onRefreshReady).toHaveBeenCalledWith(refresh);
  });

  it('should report an invalid selection when required keys are missing', () => {
    const onChange = jest.fn();
    mockUseFetchState.mockReturnValue([secrets, true, undefined, jest.fn()]);

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
    mockUseFetchState.mockReturnValue([secrets, true, undefined, jest.fn()]);

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
});

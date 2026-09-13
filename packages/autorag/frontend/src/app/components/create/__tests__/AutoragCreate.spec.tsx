import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';

let mockMaaSRefresh: () => Promise<SecretListItem[] | undefined> = async () => [];
let maasModalOnSubmit: ((name: string) => Promise<void>) | undefined;

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(() => ({ namespace: 'test-namespace' })),
}));

jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    dataTestId,
    onRefreshReady,
  }: {
    onChange: (value: unknown) => void;
    dataTestId: string;
    onRefreshReady?: (refresh: () => Promise<SecretListItem[] | undefined>) => void;
  }) => {
    onRefreshReady?.(mockMaaSRefresh);
    return (
      <button
        data-testid={dataTestId}
        onClick={() => onChange({ uuid: 'maas-1', name: 'maas-secret', invalid: false })}
      >
        Select MaaS Secret
      </button>
    );
  },
}));

jest.mock('~/app/components/common/MaaSConnectionModal', () => ({
  __esModule: true,
  default: ({
    onClose,
    onSubmit,
  }: {
    onClose: () => void;
    onSubmit: (name: string) => Promise<void>;
  }) => {
    maasModalOnSubmit = onSubmit;
    return (
      <div data-testid="maas-connection-modal">
        <button
          data-testid="maas-modal-submit"
          onClick={() => void onSubmit('new-maas-secret').then(onClose)}
        >
          Add connection
        </button>
      </div>
    );
  },
}));

const schema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(schema.full),
    defaultValues: schema.defaults,
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderComponent = () =>
  render(
    <FormWrapper>
      <AutoragCreate />
    </FormWrapper>,
  );

describe('AutoragCreate', () => {
  beforeEach(() => {
    mockMaaSRefresh = async () => [{ uuid: 'maas-1', name: 'new-maas-secret', invalid: false }];
    maasModalOnSubmit = undefined;
  });

  it('should select a MaaS Secret into the canonical form field', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('maas-secret-selector'));
    expect(screen.getByTestId('maas-secret-selector')).toBeInTheDocument();
  });

  it('should open and submit the MaaS connection modal', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('add-maas-connection-button'));
    expect(screen.getByTestId('maas-connection-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('maas-modal-submit'));
    await waitFor(() =>
      expect(screen.queryByTestId('maas-connection-modal')).not.toBeInTheDocument(),
    );
  });

  it('should keep the MaaS creation flow pending when Secret refresh fails', async () => {
    mockMaaSRefresh = async () => Promise.reject(new Error('refresh failed'));
    renderComponent();
    fireEvent.click(screen.getByTestId('add-maas-connection-button'));

    await expect(maasModalOnSubmit?.('new-maas-secret')).rejects.toThrow('refresh failed');
    expect(screen.getByTestId('maas-connection-modal')).toBeInTheDocument();
  });
});

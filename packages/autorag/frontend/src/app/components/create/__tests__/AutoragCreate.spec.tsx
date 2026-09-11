import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(() => ({ namespace: 'test-namespace' })),
}));

jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    dataTestId,
  }: {
    onChange: (value: unknown) => void;
    dataTestId: string;
  }) => (
    <button
      data-testid={dataTestId}
      onClick={() => onChange({ uuid: 'maas-1', name: 'maas-secret', invalid: false })}
    >
      Select MaaS Secret
    </button>
  ),
}));

jest.mock('~/app/components/common/MaaSConnectionModal', () => ({
  __esModule: true,
  default: ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string) => void }) => (
    <div data-testid="maas-connection-modal">
      <button
        data-testid="maas-modal-submit"
        onClick={() => {
          onSubmit('new-maas-secret');
          onClose();
        }}
      >
        Add connection
      </button>
    </div>
  ),
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
});

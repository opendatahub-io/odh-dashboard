import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { AUTORAG_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';
import { RunTriggeredTrackingContext } from '~/app/context/RunTriggeredTrackingContext';
import { mockSecretListItem } from '~/__mocks__/mockSecretListItem';
import type { SecretSelection } from '~/app/components/common/SecretSelector';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(() => ({ namespace: 'test-namespace' })),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);

jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    dataTestId,
  }: {
    onChange: (selection: SecretSelection | undefined) => void;
    dataTestId?: string;
  }) => (
    <button
      type="button"
      data-testid={dataTestId}
      onClick={() =>
        onChange(
          mockSecretListItem({
            uuid: 'uid-pg',
            name: 'pg-secret',
            type: 'pgvector',
          }),
        )
      }
    >
      Select vector database secret
    </button>
  ),
}));

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

describe('AutoragVectorStoreSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets vector_db_secret_name and fires tracking when a PGVector secret is selected', () => {
    /* eslint-disable camelcase */
    const onVectorStoreConfigured = jest.fn();
    const onFormChange = jest.fn();
    const trackingValue = {
      onKnowledgeSourceConfigured: jest.fn(),
      onEvaluationSourceConfigured: jest.fn(),
      onVectorStoreConfigured,
      onModelsConfigured: jest.fn(),
    };

    const Wrapper: React.FC = () => {
      const form = useForm({
        mode: 'onChange',
        resolver: zodResolver(configureSchema.full),
        defaultValues: configureSchema.defaults,
      });
      React.useEffect(() => {
        const sub = form.watch((values) => onFormChange(values));
        return () => sub.unsubscribe();
      }, [form]);
      return (
        <RunTriggeredTrackingContext.Provider value={trackingValue}>
          <FormProvider {...form}>
            <AutoragVectorStoreSelector />
          </FormProvider>
        </RunTriggeredTrackingContext.Provider>
      );
    };

    render(<Wrapper />);
    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

    expect(onFormChange).toHaveBeenCalledWith(
      expect.objectContaining({ vector_db_secret_name: 'pg-secret' }),
    );
    /* eslint-enable camelcase */
    expect(onVectorStoreConfigured).toHaveBeenCalledWith('pgvector');
    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.VECTOR_STORE_CONFIGURED,
      expect.objectContaining({
        providerType: 'pgvector',
        outcome: TrackingOutcome.submit,
        success: true,
      }),
    );
  });

  it('renders the secret selector toggle', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    expect(screen.getByTestId('vector-store-select-toggle')).toBeInTheDocument();
  });
});

import * as React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
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

const secretSelectorState: {
  emit: (selection: SecretSelection | undefined) => void;
  props: Record<string, unknown>;
} = {
  emit: () => undefined,
  props: {},
};

jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: (props: {
    onChange: (selection: SecretSelection | undefined) => void;
    dataTestId?: string;
    type?: string;
    namespace?: string;
    value?: string;
    isDisabled?: boolean;
  }) => {
    Object.assign(secretSelectorState.props, props);
    secretSelectorState.emit = props.onChange;
    return (
      <button
        type="button"
        data-testid={props.dataTestId}
        onClick={() =>
          props.onChange(
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
    );
  },
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
    secretSelectorState.props = {};
    secretSelectorState.emit = () => undefined;
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

  it('should request vector-db secrets for the routed namespace', () => {
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector />
      </FormWrapper>,
    );
    expect(secretSelectorState.props).toMatchObject({
      type: 'vector-db',
      namespace: 'test-namespace',
    });
  });

  it('should seed the selector value from initialSecret', () => {
    const initialSecret = mockSecretListItem({
      uuid: 'uid-initial',
      name: 'initial-vector-db',
      type: 'pgvector',
    });
    render(
      <FormWrapper>
        <AutoragVectorStoreSelector initialSecret={initialSecret} />
      </FormWrapper>,
    );
    expect(secretSelectorState.props.value).toBe('uid-initial');
  });

  it('should clear vector_db_secret_name and fire no tracking when the selection is cleared', () => {
    /* eslint-disable camelcase */
    const onFormChange = jest.fn();
    const trackingValue = {
      onKnowledgeSourceConfigured: jest.fn(),
      onEvaluationSourceConfigured: jest.fn(),
      onVectorStoreConfigured: jest.fn(),
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
    act(() => secretSelectorState.emit(undefined));
    expect(onFormChange).toHaveBeenCalledWith(
      expect.objectContaining({ vector_db_secret_name: '' }),
    );
    /* eslint-enable camelcase */
    expect(fireFormTrackingEventMock).not.toHaveBeenCalled();
  });

  it('should clear vector_db_secret_name for an invalid secret', () => {
    /* eslint-disable camelcase */
    const onFormChange = jest.fn();
    const trackingValue = {
      onKnowledgeSourceConfigured: jest.fn(),
      onEvaluationSourceConfigured: jest.fn(),
      onVectorStoreConfigured: jest.fn(),
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
    act(() =>
      secretSelectorState.emit({
        ...mockSecretListItem({ uuid: 'uid-pg', name: 'pg-secret', type: 'pgvector' }),
        invalid: true,
      }),
    );
    expect(onFormChange).toHaveBeenCalledWith(
      expect.objectContaining({ vector_db_secret_name: '' }),
    );
    /* eslint-enable camelcase */
    expect(fireFormTrackingEventMock).not.toHaveBeenCalled();
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

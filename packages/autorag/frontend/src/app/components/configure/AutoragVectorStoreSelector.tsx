import { MenuToggle, Select, SelectList, SelectOption, Skeleton } from '@patternfly/react-core';
import React, { useEffect, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import { useNotification } from '~/app/hooks/useNotification';
import {
  SUPPORTED_VECTOR_STORE_PROVIDER_TYPES,
  // TODO: Re-enable in 3.5 when DEFAULT_IN_MEMORY_PROVIDER is available.
  // DEFAULT_IN_MEMORY_PROVIDER,
  ConfigureSchema,
} from '~/app/schemas/configure.schema';
import { useLlamaStackVectorStoreProvidersQuery } from '~/app/hooks/queries';
import { LlamaStackVectorStoreProvider } from '~/app/types';

/**
 * Formats a provider for display.
 * e.g. provider_id="milvus", provider_type="remote::milvus" → "milvus (remote Milvus)"
 * e.g. provider_id="faiss", provider_type="inline::faiss" → "faiss (inline Faiss)"
 * Falls back to provider_id if provider_type doesn't follow the expected "deployment::name" format.
 */
const formatProviderDisplayName = (provider: LlamaStackVectorStoreProvider): string => {
  // TODO: Re-enable in 3.5 when DEFAULT_IN_MEMORY_PROVIDER is available.
  // Handle special case for IN_MEMORY provider
  // if (provider.provider_type === 'IN_MEMORY') {
  //   return 'ChromaDB (in-memory)';
  // }

  const [deployment, name] = provider.provider_type.split('::');
  if (!deployment || !name) {
    return provider.provider_id;
  }
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  return `${provider.provider_id} (${deployment} ${capitalizedName})`;
};

const AutoragVectorStoreSelector: React.FC = () => {
  const { namespace = '' } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const notification = useNotification();

  const {
    formState: { isSubmitting },
    control,
  } = useFormContext<ConfigureSchema>();

  const {
    field: { value: fieldValue, onChange: fieldOnChange },
  } = useController<ConfigureSchema, 'llama_stack_vector_io_provider_id'>({
    name: 'llama_stack_vector_io_provider_id',
  });

  const llamaStackSecretName = useWatch({ control, name: 'llama_stack_secret_name' });

  const {
    data: providersData,
    isLoading,
    isError,
  } = useLlamaStackVectorStoreProvidersQuery(
    namespace,
    llamaStackSecretName,
    SUPPORTED_VECTOR_STORE_PROVIDER_TYPES,
  );

  // TODO: Re-enable in 3.5 when DEFAULT_IN_MEMORY_PROVIDER is available.
  // Inject the default in-memory provider at the beginning of the list.
  // const providers = [DEFAULT_IN_MEMORY_PROVIDER, ...apiProviders];
  const apiProviders = providersData?.vector_store_providers ?? [];
  const providers = apiProviders;
  const totalProviderCount = providersData?.totalProviderCount ?? 0;

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (isError) {
      notification.error(
        'Failed to load vector I/O providers.',
        <>
          Check that the secret for the provided Llama Stack connection is valid and the API key has
          not expired.
        </>,
      );
    } else if (totalProviderCount > 0 && providers.length === 0) {
      notification.warning(
        'No compatible vector I/O providers found.',
        <>
          Vector I/O providers were found on the Llama Stack server, but none are compatible with
          AutoRAG. Ensure a remote Milvus provider is configured on your Llama Stack server.
        </>,
      );
    }
  }, [isLoading, isError, totalProviderCount, providers.length, notification]);
  const selectedProvider = providers.find((p) => p.provider_id === fieldValue);

  // Clear stale selection when the provider list changes and no longer includes
  // the previously selected provider (e.g., LlamaStack secret was changed or
  // providers became empty). Skip while loading so reconfigure flows don't
  // clear a valid initial value before providers have been fetched.
  useEffect(() => {
    if (!isLoading && fieldValue && !providers.some((p) => p.provider_id === fieldValue)) {
      fieldOnChange('');
    }
  }, [providers, fieldValue, fieldOnChange, isLoading]);

  if (isLoading) {
    return <Skeleton width="200px" height="36px" />;
  }

  const noProviders = providers.length === 0;

  return (
    <Select
      aria-label="Vector I/O provider selector"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={(_e, selectedProviderId) => {
        const provider = providers.find((p) => p.provider_id === selectedProviderId);
        fieldOnChange(provider ? provider.provider_id : '');
        setIsOpen(false);
      }}
      selected={fieldValue}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen((prev) => !prev)}
          isExpanded={isOpen}
          isDisabled={isSubmitting || isError || noProviders}
          data-testid="vector-store-select-toggle"
        >
          {noProviders
            ? 'No vector I/O providers available'
            : selectedProvider
              ? formatProviderDisplayName(selectedProvider)
              : 'Select vector I/O provider'}
        </MenuToggle>
      )}
    >
      <SelectList data-testid="vector-store-select-list">
        {providers.map((p) => (
          <SelectOption
            key={p.provider_id}
            value={p.provider_id}
            data-testid={`vector-store-option-${p.provider_id}`}
          >
            {formatProviderDisplayName(p)}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default AutoragVectorStoreSelector;

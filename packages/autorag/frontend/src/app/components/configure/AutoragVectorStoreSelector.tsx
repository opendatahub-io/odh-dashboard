import { MenuToggle, Select, SelectList, SelectOption, Skeleton } from '@patternfly/react-core';
import React, { useEffect, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import { useNotification } from '~/app/hooks/useNotification';
import {
  SUPPORTED_VECTOR_STORE_PROVIDER_TYPES,
  PROVIDER_TYPE_TO_VS_TYPE,
  ConfigureSchema,
} from '~/app/schemas/configure.schema';
import { useLlamaStackVectorStoreProvidersQuery } from '~/app/hooks/queries';
import { LlamaStackVectorStoreProvider } from '~/app/types';

/**
 * Formats a provider_type for display.
 * e.g. "remote::milvus" → "Milvus (remote)", "inline::faiss" → "Faiss (inline)"
 * Falls back to provider_id if provider_type doesn't follow the expected "deployment::name" format.
 */
const formatProviderDisplayName = (provider: LlamaStackVectorStoreProvider): string => {
  const [deployment, name] = provider.provider_type.split('::');
  if (!deployment || !name) {
    return provider.provider_id;
  }
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} (${deployment})`;
};

const AutoragVectorStoreSelector: React.FC = () => {
  const { namespace = '' } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const notification = useNotification();

  const {
    formState: { isSubmitting },
    control,
  } = useFormContext<ConfigureSchema>();

  const { field } = useController<ConfigureSchema, 'llama_stack_vector_database_id'>({
    name: 'llama_stack_vector_database_id',
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

  useEffect(() => {
    if (isError) {
      notification.error('Failed to load vector store providers');
    }
  }, [isError, notification]);

  const providers = providersData?.vector_store_providers ?? [];
  const selectedProvider = providers.find(
    (p) => PROVIDER_TYPE_TO_VS_TYPE[p.provider_type] === field.value,
  );

  if (isLoading) {
    return <Skeleton width="200px" height="36px" />;
  }

  return (
    <Select
      aria-label="Vector store selector"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={(_e, selectedValue) => {
        field.onChange(selectedValue === field.value ? '' : selectedValue);
        setIsOpen(false);
      }}
      selected={field.value}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen((prev) => !prev)}
          isExpanded={isOpen}
          isDisabled={isSubmitting || isError || providers.length === 0}
          data-testid="vector-store-select-toggle"
        >
          {selectedProvider
            ? formatProviderDisplayName(selectedProvider)
            : providers.length === 0
              ? 'No vector store providers available'
              : 'Select vector store'}
        </MenuToggle>
      )}
    >
      <SelectList data-testid="vector-store-select-list">
        {providers.map((p) => (
          <SelectOption
            key={p.provider_id}
            value={PROVIDER_TYPE_TO_VS_TYPE[p.provider_type] ?? ''}
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

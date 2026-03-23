import { MenuToggle, Select, SelectList, SelectOption, Skeleton } from '@patternfly/react-core';
import React, { useEffect, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'react-router';
import { useNotification } from '~/app/hooks/useNotification';
import { SUPPORTED_VECTOR_STORE_PROVIDERS, ConfigureSchema } from '~/app/schemas/configure.schema';
import { useLlamaStackVectorStoresQuery } from '~/app/hooks/queries';

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
    data: vectorStoresData,
    isLoading,
    isError,
  } = useLlamaStackVectorStoresQuery(
    namespace,
    llamaStackSecretName,
    SUPPORTED_VECTOR_STORE_PROVIDERS,
  );

  useEffect(() => {
    if (isError) {
      notification.error('Failed to load vector stores');
    }
  }, [isError, notification]);

  const vectorStores = vectorStoresData?.vector_stores ?? [];
  const selectedStore = vectorStores.find((vs) => vs.id === field.value);

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
          isDisabled={isSubmitting || isError || vectorStores.length === 0}
          data-testid="vector-store-select-toggle"
        >
          {(selectedStore?.name || selectedStore?.id) ??
            (vectorStores.length === 0 ? 'No vector stores available' : 'Select vector index')}
        </MenuToggle>
      )}
    >
      <SelectList data-testid="vector-store-select-list">
        {vectorStores.map((vs) => (
          <SelectOption key={vs.id} value={vs.id} data-testid={`vector-store-option-${vs.id}`}>
            {vs.name || vs.id}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default AutoragVectorStoreSelector;

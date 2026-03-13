import { MenuToggle, Select, SelectList, SelectOption, Skeleton } from '@patternfly/react-core';
import React, { useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import { SUPPORTED_VECTOR_STORE_PROVIDERS, ConfigureSchema } from '~/app/schemas/configure.schema';
import { useLlamaStackVectorStoresQuery } from '~/app/hooks/queries';

const AutoragVectorStoreSelector: React.FC = () => {
  const { namespace = '' } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  const {
    formState: { isSubmitting },
  } = useFormContext<ConfigureSchema>();

  const { field } = useController<ConfigureSchema, 'llama_stack_vector_database_id'>({
    name: 'llama_stack_vector_database_id',
  });

  // TODO: secretName should come from a react-hook-form field. Once it's implemented,
  // add secretName as a parameter into useLlamaStackVectorStoresQuery
  const { data: vectorStoresData, isLoading } = useLlamaStackVectorStoresQuery(
    namespace,
    undefined,
    SUPPORTED_VECTOR_STORE_PROVIDERS,
  );

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
        field.onChange(selectedValue === field.value ? undefined : selectedValue);
        setIsOpen(false);
      }}
      selected={field.value}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen((prev) => !prev)}
          isExpanded={isOpen}
          isDisabled={isSubmitting || vectorStores.length === 0}
          data-testid="vector-store-select-toggle"
        >
          {selectedStore?.name ??
            (vectorStores.length === 0 ? 'No vector stores available' : 'Select vector index')}
        </MenuToggle>
      )}
    >
      <SelectList data-testid="vector-store-select-list">
        {vectorStores.map((vs) => (
          <SelectOption key={vs.id} value={vs.id} data-testid={`vector-store-option-${vs.id}`}>
            {vs.name}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default AutoragVectorStoreSelector;

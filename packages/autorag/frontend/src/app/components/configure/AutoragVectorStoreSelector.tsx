import React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleAction,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { useController, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import VectorDbConnectionModal from '~/app/components/common/VectorDbConnectionModal';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { useRunTriggeredTracking } from '~/app/context/RunTriggeredTrackingContext';
import { SecretListItem } from '~/app/types';
import {
  fireAutoragVectorStoreConfigured,
  toVectorStoreProviderTypeFromSecret,
  TrackingOutcome,
} from '~/app/utilities/tracking';
import type { VectorDbBackend } from '~/app/utilities/vectorDbSecret';

type AutoragVectorStoreSelectorProps = {
  initialSecret?: SecretSelection;
};

const AutoragVectorStoreSelector: React.FC<AutoragVectorStoreSelectorProps> = ({
  initialSecret,
}) => {
  const { namespace = '' } = useParams();
  const { onVectorStoreConfigured } = useRunTriggeredTracking();
  const {
    formState: { isSubmitting },
    setValue,
  } = useFormContext<ConfigureSchema>();
  const [selectedSecret, setSelectedSecret] = React.useState<SecretSelection | undefined>(
    initialSecret,
  );
  const [isAddDropdownOpen, setIsAddDropdownOpen] = React.useState(false);
  const [modalBackend, setModalBackend] = React.useState<VectorDbBackend | null>(null);
  const secretsRefreshRef = React.useRef<(() => Promise<SecretListItem[] | undefined>) | null>(
    null,
  );

  const {
    field: { onChange: fieldOnChange },
  } = useController<ConfigureSchema, 'vector_db_secret_name'>({
    name: 'vector_db_secret_name',
  });

  const applySecret = React.useCallback(
    (secret: SecretSelection | undefined) => {
      setSelectedSecret(secret);
      fieldOnChange(!secret || secret.invalid ? '' : secret.name);
      const providerType = toVectorStoreProviderTypeFromSecret(secret?.type);
      if (secret && !secret.invalid && providerType) {
        fireAutoragVectorStoreConfigured({
          providerType,
          countOfCompatibleProviders: 1,
          outcome: TrackingOutcome.submit,
          success: true,
        });
        onVectorStoreConfigured(providerType);
      }
    },
    [fieldOnChange, onVectorStoreConfigured],
  );

  const openCreateModal = (backend: VectorDbBackend) => {
    setIsAddDropdownOpen(false);
    setModalBackend(backend);
  };

  return (
    <>
      <Split hasGutter isWrappable>
        <SplitItem isFilled>
          <SecretSelector
            dataTestId="vector-store-select-toggle"
            placeholder="Select vector database secret"
            type="vector-db"
            namespace={namespace}
            value={selectedSecret?.uuid}
            isDisabled={isSubmitting}
            showType
            onChange={applySecret}
            onRefreshReady={(refresh) => {
              secretsRefreshRef.current = refresh;
            }}
          />
        </SplitItem>
        <SplitItem>
          <Dropdown
            isOpen={isAddDropdownOpen}
            onSelect={() => setIsAddDropdownOpen(false)}
            onOpenChange={(isOpen) => setIsAddDropdownOpen(isOpen)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                variant="secondary"
                onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                isExpanded={isAddDropdownOpen}
                isDisabled={isSubmitting}
                splitButtonItems={[
                  <MenuToggleAction
                    id="add-milvus-connection-button"
                    key="add-milvus-connection-button"
                    data-testid="add-milvus-connection-button"
                    aria-label="Add new connection"
                    onClick={() => openCreateModal('milvus')}
                  >
                    Add new connection
                  </MenuToggleAction>,
                ]}
                aria-label="Add new connection, Milvus, or PGVector"
                data-testid="add-vector-db-split-button"
              />
            )}
          >
            <DropdownList>
              <DropdownItem
                key="add-milvus"
                data-testid="add-milvus-dropdown-item"
                onClick={() => openCreateModal('milvus')}
              >
                Add Milvus
              </DropdownItem>
              <DropdownItem
                key="add-pgvector"
                data-testid="add-pgvector-connection-button"
                onClick={() => openCreateModal('pgvector')}
              >
                Add PGVector
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </SplitItem>
      </Split>
      {modalBackend ? (
        <VectorDbConnectionModal
          namespace={namespace}
          initialBackend={modalBackend}
          onClose={() => setModalBackend(null)}
          onSubmit={async (secretName) => {
            const refresh = secretsRefreshRef.current;
            if (!refresh) {
              return;
            }
            const list = await refresh();
            const secret = list?.find((s) => s.name === secretName);
            if (secret) {
              applySecret({ ...secret, invalid: false });
              setValue('vector_db_secret_name', secret.name, { shouldValidate: true });
            }
          }}
        />
      ) : null}
    </>
  );
};

export default AutoragVectorStoreSelector;

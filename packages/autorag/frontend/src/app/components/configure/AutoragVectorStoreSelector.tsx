import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  MenuToggleAction,
} from '@patternfly/react-core';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import {
  SecretSelector,
  type SecretSelection,
} from '@odh-dashboard/autox-core/ui/components/feature';
import VectorDbConnectionModal from '~/app/components/common/VectorDbConnectionModal';
import { useRunTriggeredTracking } from '~/app/context/RunTriggeredTrackingContext';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { SecretListItem } from '~/app/types';
import {
  fireAutoragVectorStoreConfigured,
  getVectorStoreProviderTypeFromSecretData,
  TrackingOutcome,
  type VectorStoreProviderType,
} from '~/app/utilities/tracking';

type Props = {
  initialSecret?: SecretSelection;
  preserveInitialSelection?: boolean;
  selectedSecret?: SecretSelection;
  onSelectedSecretChange?: (secret: SecretSelection | undefined) => void;
};

const AutoragVectorStoreSelector: React.FC<Props> = ({
  initialSecret,
  preserveInitialSelection = false,
  selectedSecret: controlledSelectedSecret,
  onSelectedSecretChange,
}) => {
  const { namespace = '' } = useParams();
  const [selectedSecret, setSelectedSecret] = React.useState<SecretSelection | undefined>(
    initialSecret,
  );
  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = React.useState(false);
  const [modalProvider, setModalProvider] = React.useState<VectorStoreProviderType>('milvus');
  const secretsRefreshRef = React.useRef<(() => Promise<SecretListItem[] | undefined>) | null>(
    null,
  );
  const { onVectorStoreConfigured } = useRunTriggeredTracking();
  const form = useFormContext<ConfigureSchema>();
  const selected = onSelectedSecretChange ? controlledSelectedSecret : selectedSecret;

  const setSelected = (secret: SecretSelection | undefined) => {
    setSelectedSecret(secret);
    onSelectedSecretChange?.(secret);
  };

  return (
    <Controller
      control={form.control}
      name="db_secret_name"
      render={({ field }) => (
        <>
          <Flex
            direction={{ default: 'column', md: 'row' }}
            gap={{ default: 'gapSm' }}
            alignItems={{ default: 'alignItemsStretch', md: 'alignItemsFlexStart' }}
          >
            <FlexItem flex={{ default: 'flex_1' }}>
              <SecretSelector
                dataTestId="database-secret-selector"
                placeholder="Select database connection"
                type="database"
                allowedProviders={['milvus', 'pgvector', 'neo4j']}
                preserveSelectedValue={preserveInitialSelection}
                preservedSelection={initialSecret}
                namespace={namespace}
                value={field.value ? selected?.uuid : undefined}
                valueName={field.value}
                onChange={(secret: SecretSelection | undefined) => {
                  setSelected(secret);
                  field.onChange(!secret || secret.invalid ? '' : secret.name);
                  if (secret && !secret.invalid) {
                    const providerType = getVectorStoreProviderTypeFromSecretData(secret.data);
                    if (providerType) {
                      fireAutoragVectorStoreConfigured({
                        providerType,
                        outcome: TrackingOutcome.submit,
                        success: true,
                      });
                      onVectorStoreConfigured(providerType);
                    }
                  }
                }}
                onRefreshReady={(refresh) => {
                  secretsRefreshRef.current = refresh;
                }}
                isDisabled={form.formState.isSubmitting}
              />
            </FlexItem>
            <FlexItem>
              <Dropdown
                isOpen={isAddDropdownOpen}
                onOpenChange={setIsAddDropdownOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    variant="secondary"
                    isExpanded={isAddDropdownOpen}
                    isDisabled={form.formState.isSubmitting}
                    splitButtonItems={[
                      <MenuToggleAction
                        key="add-database"
                        className="pf-v6-u-text-nowrap"
                        data-testid="add-database-connection-button"
                        aria-label="Add new connection"
                        onClick={() => {
                          setModalProvider('milvus');
                          setIsConnectionModalOpen(true);
                        }}
                      >
                        Add new connection
                      </MenuToggleAction>,
                    ]}
                    data-testid="add-database-dropdown-toggle"
                    aria-label="Add database connection options"
                    onClick={() => setIsAddDropdownOpen((open) => !open)}
                  />
                )}
              >
                <DropdownList>
                  <DropdownItem
                    data-testid="add-milvus-connection-option"
                    onClick={() => {
                      setModalProvider('milvus');
                      setIsConnectionModalOpen(true);
                      setIsAddDropdownOpen(false);
                    }}
                  >
                    Add Milvus connection
                  </DropdownItem>
                  <DropdownItem
                    data-testid="add-pgvector-connection-option"
                    onClick={() => {
                      setModalProvider('pgvector');
                      setIsConnectionModalOpen(true);
                      setIsAddDropdownOpen(false);
                    }}
                  >
                    Add PGVector connection
                  </DropdownItem>
                  <DropdownItem
                    data-testid="add-neo4j-connection-option"
                    onClick={() => {
                      setModalProvider('neo4j');
                      setIsConnectionModalOpen(true);
                      setIsAddDropdownOpen(false);
                    }}
                  >
                    Add Neo4j connection
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </FlexItem>
          </Flex>
          {isConnectionModalOpen && (
            <VectorDbConnectionModal
              namespace={namespace}
              initialProvider={modalProvider}
              allowedProviders={['milvus', 'pgvector', 'neo4j']}
              onClose={() => setIsConnectionModalOpen(false)}
              onSubmit={async (secretName) => {
                const refresh = secretsRefreshRef.current;
                if (!refresh) {
                  throw new Error('The database connection list could not be refreshed.');
                }
                const list = await refresh();
                const secret = list?.find((item) => item.name === secretName);
                if (!secret) {
                  throw new Error(
                    'The new database connection was not found after refreshing the connection list.',
                  );
                }
                const selectedSecretFromList = { ...secret, invalid: false };
                setSelected(selectedSecretFromList);
                field.onChange(secret.name);
                const providerType = getVectorStoreProviderTypeFromSecretData(secret.data);
                if (providerType) {
                  fireAutoragVectorStoreConfigured({
                    providerType,
                    outcome: TrackingOutcome.submit,
                    success: true,
                  });
                  onVectorStoreConfigured(providerType);
                }
              }}
            />
          )}
        </>
      )}
    />
  );
};

export default AutoragVectorStoreSelector;

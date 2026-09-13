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
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import VectorDbConnectionModal from '~/app/components/common/VectorDbConnectionModal';
import { useRunTriggeredTracking } from '~/app/context/RunTriggeredTrackingContext';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { SecretListItem } from '~/app/types';
import {
  fireAutoragVectorStoreConfigured,
  getVectorStoreProviderTypeFromSecretData,
  TrackingOutcome,
} from '~/app/utilities/tracking';

type Props = {
  initialSecret?: SecretSelection;
};

const AutoragVectorStoreSelector: React.FC<Props> = ({ initialSecret }) => {
  const { namespace = '' } = useParams();
  const [selectedSecret, setSelectedSecret] = React.useState<SecretSelection | undefined>(
    initialSecret,
  );
  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = React.useState(false);
  const [modalProvider, setModalProvider] = React.useState<'milvus' | 'pgvector'>('milvus');
  const secretsRefreshRef = React.useRef<(() => Promise<SecretListItem[] | undefined>) | null>(
    null,
  );
  const { onVectorStoreConfigured } = useRunTriggeredTracking();
  const form = useFormContext<ConfigureSchema>();

  return (
    <Controller
      control={form.control}
      name="vector_db_secret_name"
      render={({ field }) => (
        <>
          <Flex
            direction={{ default: 'column', md: 'row' }}
            gap={{ default: 'gapSm' }}
            alignItems={{ default: 'alignItemsStretch', md: 'alignItemsFlexStart' }}
          >
            <FlexItem flex={{ default: 'flex_1' }}>
              <SecretSelector
                dataTestId="vector-db-secret-selector"
                placeholder="Select vector database secret"
                type="vector-db"
                namespace={namespace}
                value={selectedSecret?.uuid}
                onChange={(secret: SecretSelection | undefined) => {
                  setSelectedSecret(secret);
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
                        key="add-vector-db"
                        className="pf-v6-u-text-nowrap"
                        data-testid="add-vector-db-connection-button"
                        aria-label="Add new connection"
                        onClick={() => {
                          setModalProvider('milvus');
                          setIsConnectionModalOpen(true);
                        }}
                      >
                        Add new connection
                      </MenuToggleAction>,
                    ]}
                    data-testid="add-vector-db-dropdown-toggle"
                    aria-label="Add vector database connection options"
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
                </DropdownList>
              </Dropdown>
            </FlexItem>
          </Flex>
          {isConnectionModalOpen && (
            <VectorDbConnectionModal
              namespace={namespace}
              initialProvider={modalProvider}
              onClose={() => setIsConnectionModalOpen(false)}
              onSubmit={async (secretName) => {
                const refresh = secretsRefreshRef.current;
                if (!refresh) {
                  throw new Error('The vector database Secret list could not be refreshed.');
                }
                const list = await refresh();
                const secret = list?.find((item) => item.name === secretName);
                if (!secret) {
                  throw new Error(
                    'The new vector database Secret was not found after refreshing the Secret list.',
                  );
                }
                const selected = { ...secret, invalid: false };
                setSelectedSecret(selected);
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

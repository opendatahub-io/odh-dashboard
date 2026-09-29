import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  FormGroup,
  MenuToggle,
  MenuToggleAction,
  Radio,
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
  type VectorStoreProviderType,
} from '~/app/utilities/tracking';

type Props = {
  initialSecret?: SecretSelection;
  preserveInitialSelection?: boolean;
};

type RagMode = 'simple' | 'graph';

const AutoragVectorStoreSelector: React.FC<Props> = ({
  initialSecret,
  preserveInitialSelection = false,
}) => {
  const { namespace = '' } = useParams();
  const initialProvider = getVectorStoreProviderTypeFromSecretData(initialSecret?.data);
  const [mode, setMode] = React.useState<RagMode>(initialProvider === 'neo4j' ? 'graph' : 'simple');
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

  return (
    <Controller
      control={form.control}
      name="db_secret_name"
      render={({ field }) => (
        <>
          <FormGroup fieldId="autorag-rag-mode" label="RAG template" isRequired>
            <Radio
              id="autorag-rag-mode-simple"
              data-testid="autorag-rag-mode-simple"
              name="autorag-rag-mode"
              label="Simple RAG"
              isChecked={mode === 'simple'}
              onChange={() => {
                setMode('simple');
                setSelectedSecret(undefined);
                field.onChange('');
              }}
            />
            <Radio
              id="autorag-rag-mode-graph"
              data-testid="autorag-rag-mode-graph"
              name="autorag-rag-mode"
              label="Graph RAG"
              isChecked={mode === 'graph'}
              onChange={() => {
                setMode('graph');
                setSelectedSecret(undefined);
                field.onChange('');
              }}
            />
          </FormGroup>
          <Flex
            direction={{ default: 'column', md: 'row' }}
            gap={{ default: 'gapSm' }}
            alignItems={{ default: 'alignItemsStretch', md: 'alignItemsFlexStart' }}
          >
            <FlexItem flex={{ default: 'flex_1' }}>
              <SecretSelector
                dataTestId="database-secret-selector"
                placeholder={
                  mode === 'graph' ? 'Select Neo4j connection' : 'Select database connection'
                }
                type={mode === 'graph' ? 'database' : 'vector-db'}
                provider={mode === 'graph' ? 'neo4j' : undefined}
                allowedProviders={mode === 'graph' ? ['neo4j'] : ['milvus', 'pgvector']}
                preserveSelectedValue={preserveInitialSelection}
                namespace={namespace}
                value={selectedSecret?.uuid}
                valueName={field.value}
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
                        key="add-database"
                        className="pf-v6-u-text-nowrap"
                        data-testid="add-database-connection-button"
                        aria-label="Add new connection"
                        onClick={() => {
                          setModalProvider(mode === 'graph' ? 'neo4j' : 'milvus');
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
                  {mode === 'simple' && (
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
                  )}
                  {mode === 'simple' && (
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
                  )}
                  {mode === 'graph' && (
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
                  )}
                </DropdownList>
              </Dropdown>
            </FlexItem>
          </Flex>
          {isConnectionModalOpen && (
            <VectorDbConnectionModal
              namespace={namespace}
              initialProvider={modalProvider}
              allowedProviders={mode === 'graph' ? ['neo4j'] : ['milvus', 'pgvector']}
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

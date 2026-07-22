import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useMutation } from '@tanstack/react-query';
import { type APIOptions, useFetchState, type FetchStateCallbackPromise } from 'mod-arch-core';
import { deleteProvider, listProviders } from '~/app/api/providers';
import type { Gateway } from '~/app/types/gateway';
import type { Provider } from '~/app/types/provider';
import CreateProviderModal from './CreateProviderModal';

type ManageProvidersModalProps = {
  isOpen: boolean;
  gateway: Gateway;
  onClose: () => void;
};

const ManageProvidersModal: React.FC<ManageProvidersModalProps> = ({
  isOpen,
  gateway,
  onClose,
}) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const fetchProviders = React.useCallback<FetchStateCallbackPromise<Provider[]>>(
    async (opts) => listProviders('', gateway.name)(opts),
    [gateway.name],
  );

  const [providers, loaded, , refresh] = useFetchState<Provider[]>(fetchProviders, []);

  const { mutate: deleteProviderMutation, isPending: isDeleting } = useMutation({
    mutationKey: ['agent-ops', 'deleteProvider', gateway.name],
    mutationFn: async (provName: string) => {
      const apiOpts: APIOptions = {};
      return deleteProvider('', gateway.name)(apiOpts, provName);
    },
    onSuccess: () => {
      void refresh();
    },
    retry: false,
  });

  return (
    <>
      <Modal
        isOpen={isOpen && !showCreateModal}
        onClose={onClose}
        variant="large"
        data-testid="manage-providers-modal"
      >
        <ModalHeader title={`Providers - ${gateway.name}`} />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              {!loaded ? (
                <Spinner aria-label="Loading providers" />
              ) : providers.length === 0 ? (
                <EmptyState
                  headingLevel="h3"
                  titleText="No providers"
                  variant={EmptyStateVariant.sm}
                >
                  <EmptyStateBody>
                    No providers configured for this gateway. Add a provider to get started.
                  </EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="Providers" data-testid="providers-table">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Type</Th>
                      <Th>Profile</Th>
                      <Th />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {providers.map((provider) => (
                      <Tr key={provider.id} data-testid={`provider-row-${provider.name}`}>
                        <Td dataLabel="Name">{provider.name}</Td>
                        <Td dataLabel="Type">{provider.type}</Td>
                        <Td dataLabel="Profile">{provider.profileName ?? '-'}</Td>
                        <Td isActionCell>
                          <Button
                            variant="link"
                            isDanger
                            isDisabled={isDeleting}
                            onClick={() => deleteProviderMutation(provider.name)}
                            data-testid={`delete-provider-${provider.name}`}
                          >
                            Delete
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </StackItem>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            data-testid="add-provider-button"
          >
            Add provider
          </Button>
          <Button variant="link" onClick={onClose} data-testid="manage-providers-close">
            Close
          </Button>
        </ModalFooter>
      </Modal>
      <CreateProviderModal
        isOpen={showCreateModal}
        gatewayName={gateway.name}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          void refresh();
        }}
      />
    </>
  );
};

export default ManageProvidersModal;

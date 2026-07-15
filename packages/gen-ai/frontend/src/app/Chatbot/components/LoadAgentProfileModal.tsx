import * as React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  SearchInput,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import type { AgentProfileSummary } from '~/app/agentProfile/types';

type LoadAgentProfileModalProps = {
  onClose: () => void;
  onSelect: (profileId: string) => void;
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const LoadAgentProfileModal: React.FC<LoadAgentProfileModalProps> = ({ onClose, onSelect }) => {
  const { api, apiAvailable } = useGenAiAPI();
  const loadedProfileId = useChatbotConfigStore((s) => s.loadedProfileId);
  const [profiles, setProfiles] = React.useState<AgentProfileSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const perPage = 10;

  React.useEffect(() => {
    if (!apiAvailable) {
      setLoading(false);
      setError('API is not available. Please try again later.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listAgentProfiles()
      .then((response) => {
        if (!cancelled) {
          setProfiles(response.profiles);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load agents.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, apiAvailable]);

  const filtered = React.useMemo(() => {
    if (!filter.trim()) {
      return profiles;
    }
    const lower = filter.toLowerCase();
    return profiles.filter((p) => p.displayName.toLowerCase().includes(lower));
  }, [profiles, filter]);

  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  const paginatedProfiles = filtered.slice((page - 1) * perPage, page * perPage);

  const renderBody = () => {
    if (loading) {
      return (
        <Bullseye style={{ minHeight: 'var(--pf-t--global--spacer--2xl)' }}>
          <Spinner aria-label="Loading agents" />
        </Bullseye>
      );
    }
    if (error) {
      return <Alert variant="danger" isInline title={error} />;
    }
    if (filtered.length === 0) {
      return (
        <EmptyState>
          <EmptyStateBody>
            {profiles.length === 0 ? 'No agents found.' : 'No agents match your search.'}
          </EmptyStateBody>
        </EmptyState>
      );
    }
    return (
      <>
        <Table aria-label="Agents" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th modifier="fitContent">Last modified</Th>
              <Th modifier="fitContent" screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {paginatedProfiles.map((profile) => {
              const isLoaded = profile.profileId === loadedProfileId;
              return (
                <Tr
                  key={profile.profileId}
                  isRowSelected={isLoaded}
                  data-testid={`load-agent-profile-row-${profile.profileId}`}
                >
                  <Td dataLabel="Name">
                    <strong>{profile.displayName}</strong>
                    {profile.description && (
                      <div className="pf-v6-u-font-size-sm pf-v6-u-color-200">
                        {profile.description}
                      </div>
                    )}
                  </Td>
                  <Td dataLabel="Last modified" modifier="fitContent">
                    {formatDate(profile.lastModified)}
                  </Td>
                  <Td dataLabel="Actions" modifier="fitContent">
                    <Button
                      variant="secondary"
                      isDisabled={isLoaded}
                      onClick={() => {
                        onSelect(profile.profileId);
                        onClose();
                      }}
                      data-testid={`load-agent-profile-button-${profile.profileId}`}
                    >
                      Load agent
                    </Button>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </>
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="large"
      aria-labelledby="load-agent-profile-modal-title"
      data-testid="load-agent-profile-modal"
    >
      <ModalHeader
        title="Load agent"
        labelId="load-agent-profile-modal-title"
        description="Select a saved agent to load into the playground."
      />
      <ModalBody>
        <Toolbar
          inset={{ default: 'insetNone' }}
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        >
          <ToolbarContent>
            <ToolbarItem style={{ flex: 1 }}>
              <SearchInput
                placeholder="Find by name"
                value={filter}
                onChange={(_e, val) => setFilter(val)}
                onClear={() => setFilter('')}
                data-testid="load-agent-profile-search"
                aria-label="Filter agents by name"
              />
            </ToolbarItem>
            {filtered.length > perPage && (
              <ToolbarItem align={{ default: 'alignEnd' }}>
                <Pagination
                  itemCount={filtered.length}
                  perPage={perPage}
                  page={page}
                  onSetPage={(_e, p) => setPage(p)}
                  isCompact
                  data-testid="load-agent-profile-pagination"
                />
              </ToolbarItem>
            )}
          </ToolbarContent>
        </Toolbar>
        {renderBody()}
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default LoadAgentProfileModal;

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
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FolderIcon } from '@patternfly/react-icons';
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
          setError(err.message || 'Failed to load agent configurations.');
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

  // Reset to page 1 when the filter changes
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  const paginatedProfiles = filtered.slice((page - 1) * perPage, page * perPage);

  const renderBody = () => {
    if (loading) {
      return (
        <Bullseye style={{ minHeight: 'var(--pf-t--global--spacer--2xl)' }}>
          <Spinner aria-label="Loading agent configurations" />
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
            {profiles.length === 0
              ? 'No agent configurations found.'
              : 'No configurations match your search.'}
          </EmptyStateBody>
        </EmptyState>
      );
    }
    return (
      <>
        <Table aria-label="Agent configurations" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Last modified</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginatedProfiles.map((profile) => (
              <Tr
                key={profile.profileId}
                isClickable={profile.profileId !== loadedProfileId}
                isRowSelected={profile.profileId === loadedProfileId}
                tabIndex={profile.profileId !== loadedProfileId ? 0 : undefined}
                data-testid={`load-agent-profile-row-${profile.profileId}`}
                onClick={() => {
                  if (profile.profileId !== loadedProfileId) {
                    onSelect(profile.profileId);
                    onClose();
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    profile.profileId !== loadedProfileId
                  ) {
                    e.preventDefault();
                    onSelect(profile.profileId);
                    onClose();
                  }
                }}
              >
                <Td dataLabel="Name">
                  <FolderIcon
                    style={{
                      marginRight: 'var(--pf-t--global--spacer--sm)',
                      color: 'var(--pf-t--global--icon--color--subtle)',
                    }}
                  />
                  {profile.displayName}
                </Td>
                <Td dataLabel="Last modified">{formatDate(profile.lastModified)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {filtered.length > perPage && (
          <Pagination
            itemCount={filtered.length}
            perPage={perPage}
            page={page}
            onSetPage={(_e, p) => setPage(p)}
            isCompact
            data-testid="load-agent-profile-pagination"
          />
        )}
      </>
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="medium"
      aria-labelledby="load-agent-profile-modal-title"
      data-testid="load-agent-profile-modal"
    >
      <ModalHeader
        title="Load agent configuration"
        labelId="load-agent-profile-modal-title"
        description="Select a saved agent configuration to load into the playground."
      />
      <ModalBody>
        <SearchInput
          placeholder="Find by name"
          value={filter}
          onChange={(_e, val) => setFilter(val)}
          onClear={() => setFilter('')}
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
          data-testid="load-agent-profile-search"
          aria-label="Filter agent configurations by name"
        />
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

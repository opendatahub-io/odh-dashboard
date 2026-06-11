import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import { useNavigate, useParams } from 'react-router-dom';
import { TruncatedText } from 'mod-arch-shared';
import { AgentProfileSummary } from '~/app/agentProfile/types';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import DeleteAgentProfileModal from './DeleteAgentProfileModal';

type AgentProfileTableRowProps = {
  profile: AgentProfileSummary;
  onDelete: (profileId: string) => Promise<void>;
};

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AgentProfileTableRow: React.FC<AgentProfileTableRowProps> = ({ profile, onDelete }) => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const handleTryInPlayground = () => {
    navigate({
      pathname: genAiChatPlaygroundRoute(namespace),
      search: `?agentProfileId=${encodeURIComponent(profile.profileId)}`,
    });
  };

  return (
    <>
      <Tr data-testid={`agent-profile-row-${profile.profileId}`}>
        <Td dataLabel="Name">
          <span className="pf-v6-u-font-weight-bold">{profile.displayName}</span>
        </Td>
        <Td dataLabel="Description">
          {profile.description ? (
            <TruncatedText maxLines={2} content={profile.description} />
          ) : (
            <span className="pf-v6-u-color-200">—</span>
          )}
        </Td>
        <Td dataLabel="Last modified">{formatDate(profile.lastModified)}</Td>
        <Td dataLabel="Actions" isActionCell>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--pf-t--global--spacer--sm)',
            }}
          >
            <Button
              variant={ButtonVariant.secondary}
              onClick={handleTryInPlayground}
              data-testid={`try-in-playground-${profile.profileId}`}
            >
              Try in Playground
            </Button>
            <Dropdown
              isOpen={isKebabOpen}
              onOpenChange={setIsKebabOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="plain"
                  onClick={() => setIsKebabOpen(!isKebabOpen)}
                  isExpanded={isKebabOpen}
                  aria-label={`Actions for ${profile.displayName}`}
                  icon={<EllipsisVIcon />}
                  data-testid={`agent-profile-kebab-${profile.profileId}`}
                />
              )}
              popperProps={{ position: 'end' }}
            >
              <DropdownList>
                <DropdownItem
                  key="delete"
                  isDanger
                  onClick={() => {
                    setIsKebabOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  data-testid={`delete-agent-profile-${profile.profileId}`}
                >
                  Delete
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </div>
        </Td>
      </Tr>
      {isDeleteModalOpen && (
        <DeleteAgentProfileModal
          profile={profile}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => onDelete(profile.profileId)}
        />
      )}
    </>
  );
};

export default AgentProfileTableRow;

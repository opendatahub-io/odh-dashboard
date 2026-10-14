import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Skeleton,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TruncatedText } from 'mod-arch-shared';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AgentDeploymentSummary, AgentProfileSummary } from '~/app/agentProfile/types';
import { genAiAgentProfileDetailRoute, genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';
import DeleteAgentProfileModal from './DeleteAgentProfileModal';
import EditAgentProfileModal from './EditAgentProfileModal';
import AgentProfileEndpointsModal from './AgentProfileEndpointsModal';

type AgentProfileTableRowProps = {
  profile: AgentProfileSummary;
  deployments: AgentDeploymentSummary[];
  deploymentsLoading: boolean;
  onDelete: (profileId: string) => Promise<void>;
  onRefresh: () => void;
  showEndpointsColumn: boolean;
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

const AgentProfileTableRow: React.FC<AgentProfileTableRowProps> = ({
  profile,
  deployments,
  deploymentsLoading,
  onDelete,
  onRefresh,
  showEndpointsColumn,
}) => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isEndpointsModalOpen, setIsEndpointsModalOpen] = React.useState(false);

  const handleTryInPlayground = () => {
    fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.TRY_IN_PLAYGROUND_SELECTED, {
      agentID: profile.profileId,
    });
    navigate({
      pathname: genAiChatPlaygroundRoute(namespace),
      search: `?agentProfileId=${encodeURIComponent(profile.profileId)}`,
    });
  };

  return (
    <>
      <Tr data-testid={`agent-profile-row-${profile.profileId}`}>
        <Td dataLabel="Name">
          {namespace ? (
            <Link
              to={genAiAgentProfileDetailRoute(namespace, profile.profileId)}
              className="pf-v6-u-font-weight-bold"
              data-testid={`agent-profile-link-${profile.profileId}`}
            >
              {profile.displayName}
            </Link>
          ) : (
            <span className="pf-v6-u-font-weight-bold">{profile.displayName}</span>
          )}
        </Td>
        <Td dataLabel="Description">
          {profile.description ? (
            <TruncatedText maxLines={2} content={profile.description} />
          ) : (
            <span className="pf-v6-u-color-200">—</span>
          )}
        </Td>
        {showEndpointsColumn && (
          <Td dataLabel="Endpoint(s)">
            {deploymentsLoading ? (
              <Skeleton
                width="3rem"
                fontSize="md"
                screenreaderText="Loading endpoint availability"
              />
            ) : deployments.length > 0 ? (
              <Button
                variant={ButtonVariant.link}
                isInline
                onClick={() => setIsEndpointsModalOpen(true)}
                data-testid={`view-agent-endpoints-${profile.profileId}`}
              >
                View
              </Button>
            ) : (
              <span className="pf-v6-u-color-200">—</span>
            )}
          </Td>
        )}
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
                  key="edit"
                  onClick={() => {
                    setIsKebabOpen(false);
                    fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.DETAILS_EDIT_SELECTED, {
                      agentID: profile.profileId,
                    });
                    setIsEditModalOpen(true);
                  }}
                  data-testid={`edit-agent-profile-${profile.profileId}`}
                >
                  Edit
                </DropdownItem>
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
      {isEditModalOpen && (
        <EditAgentProfileModal
          profile={profile}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={onRefresh}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteAgentProfileModal
          profile={profile}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => onDelete(profile.profileId)}
        />
      )}
      {isEndpointsModalOpen && namespace && (
        <AgentProfileEndpointsModal
          agentName={profile.displayName}
          namespace={namespace}
          profileId={profile.profileId}
          deployments={deployments}
          onClose={() => setIsEndpointsModalOpen(false)}
        />
      )}
    </>
  );
};

export default AgentProfileTableRow;

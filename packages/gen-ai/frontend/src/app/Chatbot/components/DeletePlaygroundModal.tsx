import { useTrackEvent } from '@odh-dashboard/analytics/react';
import * as React from 'react';
import { errorCategory } from '@odh-dashboard/internal/concepts/analyticsTracking/errorTrackingUtils';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import DeleteModal from '~/app/shared/DeleteModal';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

type DeletePlaygroundModalProps = {
  onCancel: () => void;
};

const DELETE_PLAYGROUND_EVENT_NAME = 'Playground Delete';

const DeletePlaygroundModal: React.FC<DeletePlaygroundModalProps> = ({ onCancel }) => {
  const trackEvent = useTrackEvent();
  const { namespace } = React.useContext(GenAiContext);
  const { lsdStatus, refresh } = React.useContext(ChatbotContext);
  const [isDeleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { api, apiAvailable } = useGenAiAPI();

  return (
    <DeleteModal
      title="Delete playground?"
      testId="delete-playground-modal"
      onClose={() => {
        onCancel();
        trackEvent(DELETE_PLAYGROUND_EVENT_NAME, {
          outcome: TrackingOutcome.cancel,
          namespace: namespace?.name,
        });
      }}
      deleting={isDeleting}
      error={error}
      onDelete={async () => {
        setDeleting(true);
        if (apiAvailable && lsdStatus?.name) {
          api
            .deleteLSD({
              name: lsdStatus.name,
            })
            .then(() => {
              onCancel();
              trackEvent(DELETE_PLAYGROUND_EVENT_NAME, {
                outcome: TrackingOutcome.submit,
                success: true,
                namespace: namespace?.name,
              });
              refresh();
            })
            .catch((e) => {
              trackEvent(DELETE_PLAYGROUND_EVENT_NAME, {
                outcome: TrackingOutcome.submit,
                success: false,
                namespace: namespace?.name,
                error: errorCategory(e),
              });
              setError(e);
            })
            .finally(() => {
              setDeleting(false);
            });
        }
      }}
      submitButtonLabel="Delete"
      deleteName={namespace?.displayName || 'playground'}
    >
      This action cannot be undone. This will delete the playground for all users in this project.
    </DeleteModal>
  );
};

export default DeletePlaygroundModal;

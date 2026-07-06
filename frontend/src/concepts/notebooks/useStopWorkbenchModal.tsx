import * as React from 'react';
import { stopWorkbenches } from '#~/pages/notebookController/utils';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
import { useUser } from '#~/redux/selectors';
import { Notebook } from '#~/types';
import useNotification from '#~/utilities/useNotification';

type StopWorkbenchModalProps = {
  notebooksToStop: Notebook[];
  refresh: () => void;
};

export const useStopWorkbenchModal = ({
  notebooksToStop,
  refresh,
}: StopWorkbenchModalProps): {
  showModal: boolean;
  isDeleting: boolean;
  onStop: () => void;
  onNotebooksStop: (didStop: boolean) => void;
} => {
  const [showModal, setShowModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const notification = useNotification();
  const { isAdmin } = useUser();

  const onNotebooksStop = (didStop: boolean) => {
    if (didStop) {
      setIsDeleting(true);
      stopWorkbenches(notebooksToStop, isAdmin)
        .then(() => {
          refresh();
          setShowModal(false);
        })
        .catch((e) => {
          notification.error(
            `Error stopping workbench${notebooksToStop.length > 1 ? 's' : ''}`,
            e.message,
          );
        })
        .finally(() => {
          setIsDeleting(false);
        });
    } else {
      setShowModal(false);
    }
  };

  const onStop = () => {
    if (dontShowModalValue) {
      onNotebooksStop(true);
    } else {
      setShowModal(true);
    }
  };

  return { showModal, isDeleting, onStop, onNotebooksStop };
};

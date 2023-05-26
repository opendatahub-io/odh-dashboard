import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { TemplateKind } from '~/k8sTypes';
import { deleteTemplateBackend } from '~/services/templateService';
import { getServingRuntimeDisplayNameFromTemplate } from './utils';

type DeleteCustomServingRuntimeModalProps = {
  template?: TemplateKind;
  onClose: (deleted: boolean) => void;
};

const DeleteCustomServingRuntimeModal: React.FC<DeleteCustomServingRuntimeModalProps> = ({
  template,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = template
    ? getServingRuntimeDisplayNameFromTemplate(template)
    : 'this serving runtime';

  return (
    <DeleteModal
      title="Delete serving runtime?"
      isOpen={!!template}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete serving runtime"
      onDelete={() => {
        if (template) {
          setIsDeleting(true);
          // TODO: Revert back to pass through api once we migrate admin panel
          deleteTemplateBackend(template.metadata.name, template.metadata.namespace)
            .then(() => {
              onBeforeClose(true);
            })
            .catch((e) => {
              setError(e);
              setIsDeleting(false);
            });
        }
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      This action cannot be undone. Models already deployed using this runtime will not be affected
      by this action.
    </DeleteModal>
  );
};

export default DeleteCustomServingRuntimeModal;

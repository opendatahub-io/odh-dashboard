import * as React from 'react';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { TemplateKind } from '#~/k8sTypes';
import { useDashboardNamespace } from '#~/redux/selectors';
import { deleteTemplateBackend } from '#~/services/templateService';
import { patchDashboardConfigTemplateDisablementBackend } from '#~/services/dashboardService';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getTemplateEnabled,
  setListDisabled,
} from './utils';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

type DeleteCustomServingRuntimeModalProps = {
  template: TemplateKind;
  onClose: (deleted: boolean) => void;
};

const DeleteCustomServingRuntimeModal: React.FC<DeleteCustomServingRuntimeModalProps> = ({
  template,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const {
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    servingRuntimeTemplates: [templates],
  } = React.useContext(CustomServingRuntimeContext);

  const { dashboardNamespace } = useDashboardNamespace();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = getServingRuntimeDisplayNameFromTemplate(template);

  return (
    <DeleteModal
      title="Delete serving runtime?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete serving runtime"
      onDelete={() => {
        setIsDeleting(true);
        // TODO: Revert back to pass through api once we migrate admin panel
        const templateDisablemetUpdated = setListDisabled(
          template,
          templates,
          templateDisablement,
          false,
        );
        Promise.all([
          ...(!getTemplateEnabled(template, templateDisablement)
            ? [
                patchDashboardConfigTemplateDisablementBackend(
                  templateDisablemetUpdated,
                  dashboardNamespace,
                ),
              ]
            : []),
          deleteTemplateBackend(template.metadata.name, template.metadata.namespace),
        ])
          .then(() => {
            onBeforeClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
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

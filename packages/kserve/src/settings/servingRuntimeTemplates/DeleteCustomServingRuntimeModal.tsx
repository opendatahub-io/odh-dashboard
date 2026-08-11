import * as React from 'react';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getTemplateEnabled,
  setListDisabled,
} from '@odh-dashboard/model-serving/shared';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard delete confirmation wrapper
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { deleteTemplateBackend } from '@odh-dashboard/internal/services/templateService';
import { patchDashboardConfigTemplateDisablementBackend } from '@odh-dashboard/internal/services/dashboardService';
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

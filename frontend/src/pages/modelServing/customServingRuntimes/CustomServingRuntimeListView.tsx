import * as React from 'react';
import { useNavigate } from 'react-router';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { TemplateKind } from '#~/k8sTypes';
import { useDashboardNamespace } from '#~/redux/selectors';
import useNotification from '#~/utilities/useNotification';
import { Table } from '#~/components/table';
import useDraggableTable from '#~/utilities/useDraggableTable';
import { patchDashboardConfigTemplateOrderBackend } from '#~/services/dashboardService';
import { getServingRuntimeNameFromTemplate, getSortedTemplates } from './utils';
import DeleteCustomServingRuntimeModal from './DeleteCustomServingRuntimeModal';
import { columns } from './templatedData';
import CustomServingRuntimeTableRow from './CustomServingRuntimeTableRow';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeListView: React.FC = () => {
  const {
    servingRuntimeTemplateOrder: { data: templateOrder, refresh: refreshOrder },
    servingRuntimeTemplates: [unsortedTemplates],
    refreshData,
  } = React.useContext(CustomServingRuntimeContext);
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();
  const navigate = useNavigate();

  const [deleteTemplate, setDeleteTemplate] = React.useState<TemplateKind>();

  const sortedTemplates = React.useMemo(
    () => getSortedTemplates(unsortedTemplates, templateOrder),
    [unsortedTemplates, templateOrder],
  );
  const setItemOrder = React.useCallback(
    (itemOrder: string[]) => {
      // TODO: Disable backend workaround when we migrate admin panel to Passthrough API
      patchDashboardConfigTemplateOrderBackend(itemOrder, dashboardNamespace)
        .then(refreshOrder)
        .catch((e) => notification.error(`Error updating the serving runtimes order`, e.message));
    },
    [dashboardNamespace, refreshOrder, notification],
  );

  const { tableProps, rowProps } = useDraggableTable(
    sortedTemplates.map((template) => getServingRuntimeNameFromTemplate(template)),
    setItemOrder,
  );

  return (
    <>
      <Table
        {...tableProps}
        data={sortedTemplates}
        columns={columns}
        rowRenderer={(template, rowIndex) => (
          <CustomServingRuntimeTableRow
            {...rowProps}
            key={template.metadata.uid}
            obj={template}
            rowIndex={rowIndex}
            onDeleteTemplate={(obj) => setDeleteTemplate(obj)}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            <Button
              data-testid="add-serving-runtime-button"
              onClick={() => navigate('/settings/model-resources-operations/serving-runtimes/add')}
            >
              Add serving runtime
            </Button>
          </ToolbarItem>
        }
      />
      {deleteTemplate ? (
        <DeleteCustomServingRuntimeModal
          template={deleteTemplate}
          onClose={(deleted) => {
            if (deleted) {
              refreshData();
            }
            setDeleteTemplate(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default CustomServingRuntimeListView;

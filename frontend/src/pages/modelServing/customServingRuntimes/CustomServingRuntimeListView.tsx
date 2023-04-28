import * as React from 'react';
import { useNavigate } from 'react-router';
import { Button, ToolbarItem } from '@patternfly/react-core';
import Table from '~/components/Table';
import { TemplateKind } from '~/k8sTypes';
import { patchDashboardConfigTemplateOrder } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import useNotification from '~/utilities/useNotification';
import { getDragItemOrder } from './utils';
import DeleteCustomServingRuntimeModal from './DeleteCustomServingRuntimeModal';
import { columns } from './templatedData';
import CustomServingRuntimeTableRow from './CustomServingRuntimeTableRow';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeListView: React.FC = () => {
  const {
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplates: { data: templates },
    refreshData,
  } = React.useContext(CustomServingRuntimeContext);
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();
  const navigate = useNavigate();
  const [deleteTemplate, setDeleteTemplate] = React.useState<TemplateKind>();
  const [dragItemOrder, setDragItemOrder] = React.useState(
    getDragItemOrder(templates, templateOrder),
  );

  React.useEffect(() => {
    patchDashboardConfigTemplateOrder(dragItemOrder, dashboardNamespace).catch((e) =>
      notification.error(`Error update the serving runtimes order`, e.message),
    );
  }, [dragItemOrder, dashboardNamespace, notification]);

  React.useEffect(() => {
    setDragItemOrder(getDragItemOrder(templates, templateOrder));
  }, [templates, templateOrder]);

  return (
    <>
      <Table
        isDraggable
        data={templates}
        columns={columns}
        itemOrder={dragItemOrder}
        setItemOrder={setDragItemOrder}
        rowRenderer={(template, rowIndex, trDragFunctions) => (
          <CustomServingRuntimeTableRow
            key={template.metadata.uid}
            obj={template}
            rowIndex={rowIndex}
            dragFunctions={trDragFunctions}
            onDeleteTemplate={(obj) => setDeleteTemplate(obj)}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            <Button onClick={() => navigate('/servingRuntimes/addServingRuntime')}>
              Add serving runtime
            </Button>
          </ToolbarItem>
        }
      />
      <DeleteCustomServingRuntimeModal
        template={deleteTemplate}
        onClose={(deleted) => {
          if (deleted) {
            refreshData();
          }
          setDeleteTemplate(undefined);
        }}
      />
    </>
  );
};

export default CustomServingRuntimeListView;

import * as React from 'react';
import { useNavigate } from 'react-router';
import { Button, ToolbarItem } from '@patternfly/react-core';
import styles from '@patternfly/react-styles/css/components/Table/table';
import { TemplateKind } from '~/k8sTypes';
import { patchDashboardConfigTemplateOrder } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import useNotification from '~/utilities/useNotification';
import Table from '~/components/Table';
import useDraggableTable from '~/utilities/useDraggableTable';
import { getServingRuntimeNameFromTemplate, getSortedTemplates } from './utils';
import DeleteCustomServingRuntimeModal from './DeleteCustomServingRuntimeModal';
import { columns } from './templatedData';
import CustomServingRuntimeTableRow from './CustomServingRuntimeTableRow';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

const CustomServingRuntimeListView: React.FC = () => {
  const {
    servingRuntimeTemplateOrder: { data: templateOrder, refresh: refreshOrder },
    servingRuntimeTemplates: { data: unsortedTemplates },
    refreshData,
  } = React.useContext(CustomServingRuntimeContext);
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();
  const navigate = useNavigate();
  const bodyRef = React.useRef<HTMLTableSectionElement>(null);
  const [deleteTemplate, setDeleteTemplate] = React.useState<TemplateKind>();
  const sortedTemplates = React.useMemo(
    () => getSortedTemplates(unsortedTemplates, templateOrder),
    [unsortedTemplates, templateOrder],
  );
  const setItemOrder = React.useCallback(
    (itemOrder: string[]) => {
      patchDashboardConfigTemplateOrder(itemOrder, dashboardNamespace)
        .then(refreshOrder)
        .catch((e) => notification.error(`Error update the serving runtimes order`, e.message));
    },
    [dashboardNamespace, refreshOrder, notification],
  );

  const { isDragging, tbodyDragFunctions, trDragFunctions } = useDraggableTable(
    bodyRef,
    sortedTemplates.map((template) => getServingRuntimeNameFromTemplate(template)),
    setItemOrder,
  );

  return (
    <>
      <Table
        className={isDragging ? styles.modifiers.dragOver : undefined}
        data={sortedTemplates}
        columns={columns}
        rowRenderer={(template, rowIndex) => (
          <CustomServingRuntimeTableRow
            key={template.metadata.uid}
            obj={template}
            rowIndex={rowIndex}
            bodyRef={bodyRef}
            trDragFunctions={trDragFunctions}
            onDeleteTemplate={(obj) => setDeleteTemplate(obj)}
          />
        )}
        tbodyProps={{ ...tbodyDragFunctions, ref: bodyRef }}
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

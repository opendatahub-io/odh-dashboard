import * as React from 'react';
import * as _ from 'lodash';
import { useNavigate } from 'react-router';
import { Button, ToolbarItem } from '@patternfly/react-core';
import Table from '~/components/Table';
import { TemplateKind } from '~/k8sTypes';
import { patchDashboardConfigTemplateOrder } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import useNotification from '~/utilities/useNotification';
import { compareTemplateKinds } from './utils';
import { columns } from './templatedData';
import CustomServingRuntimeTableRow from './CustomServingRuntimeTableRow';

type CustomServingRuntimeListViewProps = {
  templates: TemplateKind[];
  templateOrder: string[];
  refreshOrder: () => void;
};

const CustomServingRuntimeListView: React.FC<CustomServingRuntimeListViewProps> = ({
  templates,
  templateOrder,
  refreshOrder,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const initialItemOrder = React.useMemo(
    () =>
      templates.sort(compareTemplateKinds(templateOrder)).map((template) => template.metadata.name),
    [templates, templateOrder],
  );
  const notification = useNotification();
  const navigate = useNavigate();

  const onDropCallback = React.useCallback(
    (newTemplateOrder) => {
      if (!_.isEqual(newTemplateOrder, templateOrder)) {
        patchDashboardConfigTemplateOrder(newTemplateOrder, dashboardNamespace)
          .then(refreshOrder)
          .catch((e) => notification.error(`Error update the serving runtimes order`, e.message));
      }
    },
    [templateOrder, dashboardNamespace, refreshOrder, notification],
  );

  return (
    <>
      <Table
        isDraggable
        data={templates}
        columns={columns}
        initialItemOrder={initialItemOrder}
        rowRenderer={(template, rowIndex, trDragFunctions) => (
          <CustomServingRuntimeTableRow
            key={template.metadata.uid}
            obj={template}
            rowIndex={rowIndex}
            dragFunctions={trDragFunctions}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            <Button onClick={() => navigate('/servingRuntimes/addServingRuntime')}>
              Add serving runtime
            </Button>
          </ToolbarItem>
        }
        onDropCallback={onDropCallback}
      />
    </>
  );
};

export default CustomServingRuntimeListView;

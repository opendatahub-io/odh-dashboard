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
  refresh: () => void;
};

const CustomServingRuntimeListView: React.FC<CustomServingRuntimeListViewProps> = ({
  templates,
  templateOrder,
  refresh,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();
  const navigate = useNavigate();

  const onDropCallback = React.useCallback(
    (newTemplateOrder) => {
      if (!_.isEqual(newTemplateOrder, templateOrder)) {
        patchDashboardConfigTemplateOrder(newTemplateOrder, dashboardNamespace)
          .then(refresh)
          .catch((e) => notification.error(`Error update the serving runtimes order`, e.message));
      }
    },
    [templateOrder, dashboardNamespace, refresh, notification],
  );

  return (
    <>
      <Table
        isDraggable
        data={templates}
        columns={columns}
        initialItemOrder={templates
          .sort(compareTemplateKinds(templateOrder))
          .map((template) => template.metadata.name)}
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

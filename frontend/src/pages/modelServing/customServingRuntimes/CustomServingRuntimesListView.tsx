import * as React from 'react';
import * as _ from 'lodash';
import { Button, ToolbarItem } from '@patternfly/react-core';
import Table from '~/components/Table';
import { TemplateKind } from '~/k8sTypes';
import { patchDashboardConfigTemplateOrder } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import useNotification from '~/utilities/useNotification';
import { compareTemplateKinds } from './utils';
import { columns } from './templatedData';
import CustomServingRuntimesTableRow from './CustomServingRuntimesTableRow';

type CustomServingRuntimesListViewProps = {
  templates: TemplateKind[];
  templateOrder: string[];
  refresh: () => void;
};

const CustomServingRuntimesListView: React.FC<CustomServingRuntimesListViewProps> = ({
  templates,
  templateOrder,
  refresh,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();

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
          <CustomServingRuntimesTableRow
            key={template.metadata.uid}
            obj={template}
            rowIndex={rowIndex}
            dragFunctions={trDragFunctions}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            {/* TODO: Add navigation to the adding serving runtime page */}
            <Button>Add serving runtime</Button>
          </ToolbarItem>
        }
        onDropCallback={onDropCallback}
      />
    </>
  );
};

export default CustomServingRuntimesListView;

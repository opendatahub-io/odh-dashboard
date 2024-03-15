import * as React from 'react';
import { Button, Panel, PanelFooter, PanelHeader, PanelMainBody } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Table } from '~/components/table';
import { BYONImagePackage } from '~/types';
import { DisplayedContentTab } from './ManageBYONImageModal';
import { getColumns } from './tableData';
import DisplayedContentTableRow from './DisplayedContentTableRow';

type DisplayedContentTableProps = {
  tabKey: DisplayedContentTab;
  onReset: () => void;
  onConfirm: (rowIndex: number, name: string, version: string) => void;
  resources: BYONImagePackage[];
  onAdd: () => void;
  editIndex?: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
};

const DisplayedContentTable: React.FC<DisplayedContentTableProps> = ({
  tabKey,
  onReset,
  onConfirm,
  resources,
  onAdd,
  editIndex,
  onEdit,
  onDelete,
}) => {
  const content = tabKey === DisplayedContentTab.SOFTWARE ? 'software' : 'packages';
  const columns = getColumns(tabKey);

  return (
    <Panel>
      <PanelHeader>
        Add the {content} labels that will be displayed with this notebook image. Modifying the{' '}
        {content} here does not effect the contents of the notebook image.
      </PanelHeader>
      <PanelMainBody>
        <Table
          data-testid={`displayed-content-table-${content}`}
          variant="compact"
          data={resources}
          columns={columns}
          disableRowRenderSupport
          rowRenderer={(resource, rowIndex) => (
            <DisplayedContentTableRow
              key={rowIndex}
              obj={resource}
              tabKey={tabKey}
              isActive={editIndex === rowIndex}
              isEditing={editIndex !== undefined}
              onConfirm={(name, version) => onConfirm(rowIndex, name, version)}
              onReset={onReset}
              onEdit={() => onEdit(rowIndex)}
              onDelete={() => onDelete(rowIndex)}
              onMoveToNextRow={() => {
                if (rowIndex === resources.length - 1) {
                  onAdd();
                } else {
                  onEdit(rowIndex + 1);
                }
              }}
            />
          )}
        />
      </PanelMainBody>
      <PanelFooter>
        <Button
          data-testid={`add-${content}-resource-button`}
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={onAdd}
          isDisabled={editIndex !== undefined}
          isInline
        >
          Add {content}
        </Button>
      </PanelFooter>
    </Panel>
  );
};

export default DisplayedContentTable;

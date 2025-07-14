import * as React from 'react';
import {
  Button,
  Panel,
  PanelFooter,
  PanelHeader,
  PanelMainBody,
  TextInput,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { BYONImagePackage } from '#~/types';
import useDraggableTableControlled from '#~/utilities/useDraggableTableControlled';
import { DisplayedContentTab } from './ManageBYONImageModal';
import { getColumns } from './tableData';

type DisplayedContentTableProps = {
  tabKey: DisplayedContentTab;
  resources: BYONImagePackage[];
  setResources: React.Dispatch<React.SetStateAction<BYONImagePackage[]>>;
};

const DisplayedContentTable: React.FC<DisplayedContentTableProps> = ({
  tabKey,
  resources,
  setResources,
}) => {
  const content = tabKey === DisplayedContentTab.SOFTWARE ? 'software' : 'packages';
  const dataLabel = tabKey === DisplayedContentTab.SOFTWARE ? 'Software' : 'Packages';
  const columns = getColumns(tabKey);
  const { tableProps, rowsToRender } = useDraggableTableControlled<{
    name: string;
    version: string;
    visible: boolean;
  }>(resources, setResources);

  return (
    <Panel>
      <PanelHeader>
        Add the {content} labels that will be displayed with this workbench image. Modifying the{' '}
        {content} here does not affect the contents of the workbench image.
      </PanelHeader>
      <PanelMainBody>
        <Table
          data-testid={`displayed-content-table-${content}`}
          className={tableProps.className}
          variant="compact"
        >
          <Thead noWrap>
            <Tr>
              <Th screenReaderText="Drag and drop" />
              {columns.map((column, columnIndex) => (
                <Th key={columnIndex}>{column.label}</Th>
              ))}
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody {...tableProps.tbodyProps}>
            {rowsToRender.map((r, i) => (
              <Tr
                key={i}
                draggable
                {...r.rowProps}
                data-testid="displayed-content-row"
                style={{ verticalAlign: 'baseline' }}
              >
                <Td
                  draggableRow={{
                    id: `draggable-row-${r.rowProps.id}`,
                  }}
                />
                <Td dataLabel={dataLabel}>
                  <TextInput
                    data-testid={`${dataLabel}-name-input-${i}`}
                    value={r.data.name}
                    type="text"
                    onChange={(_, name) => {
                      const updatedResources = [...resources];
                      updatedResources[i].name = name;
                      setResources(updatedResources);
                    }}
                    aria-label={`${dataLabel} name input`}
                  />
                </Td>
                <Td dataLabel="Version">
                  <TextInput
                    data-testid={`${dataLabel}-version-input-${i}`}
                    value={r.data.version}
                    type="text"
                    onChange={(_, version) => {
                      const updatedResources = [...resources];
                      updatedResources[i].version = version;
                      setResources(updatedResources);
                    }}
                    aria-label={`${dataLabel} version input`}
                  />
                </Td>
                <Td>
                  <Button
                    icon={<MinusCircleIcon />}
                    data-testid={`remove-displayed-content-button-${i}`}
                    aria-label="Remove displayed content"
                    variant="plain"
                    isDisabled={rowsToRender.length === 1 && !r.data.name && !r.data.version}
                    onClick={() => {
                      if (rowsToRender.length === 1) {
                        setResources([{ name: '', version: '', visible: true }]);
                      } else {
                        setResources(resources.filter((_, index) => i !== index));
                      }
                    }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PanelMainBody>
      <PanelFooter>
        <Button
          data-testid={`add-${content}-resource-button`}
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() => {
            setResources([...resources, { name: '', version: '', visible: true }]);
          }}
        >
          Add {content}
        </Button>
      </PanelFooter>
    </Panel>
  );
};

export default DisplayedContentTable;

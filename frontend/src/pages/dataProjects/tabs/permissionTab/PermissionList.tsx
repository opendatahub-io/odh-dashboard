import * as React from 'react';
import * as _ from 'lodash';
import {
  ActionsColumn,
  IAction,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { Button, SelectOptionObject, Title } from '@patternfly/react-core';

import '../DataProjectTabs.scss';
import { PlusCircleIcon } from '@patternfly/react-icons';
import PermissionListRow from './PermissionListRow';
import { PermissionType } from 'types';

type PermissionListProps = {
  data: any;
  setData: any;
  type: 'user' | 'group';
};

const PermissionList: React.FC<PermissionListProps> = React.memo(({ data, type, setData }) => {
  const title = type === 'user' ? 'User' : 'Group';

  const [addRows, setAddRows] = React.useState<any>([]);

  if (!data) {
    return null;
  }

  const rowActions = (row): IAction[] => [
    {
      title: 'Some action',
      onClick: () => console.log(`clicked on Some action, on row ${row.name}`),
    },
  ];

  const handleAddRow = () => {
    setAddRows([
      ...addRows,
      {
        name: '',
        permission: PermissionType.View,
      },
    ]);
  };

  const handleNameChange = (value: string, index: number) => {
    const newRows = [...addRows];
    newRows[index].name = value;
    setAddRows(newRows);
  };

  const handlePermissionSelection = (selection: string | SelectOptionObject, index: number) => {
    const newRows = [...addRows];
    newRows[index].permission = selection;
    setAddRows(newRows);
  };

  const handleRemoveRow = (index: number) => {
    const newAddRows = [...addRows];
    newAddRows.splice(index, 1);
    setAddRows(newAddRows);
  };

  const handleSubmitRow = (index: number) => {
    setData([...data, addRows[index]]);
  };

  return (
    <>
      <Title
        headingLevel="h5"
        size="lg"
        className="odh-data-projects__tabs-list-title"
      >{`${title}s`}</Title>
      <TableComposable
        aria-label={`${title} permission list`}
        variant="compact"
        className="odh-data-projects__tabs-list"
      >
        <Thead>
          <Tr>
            <Th width={40}>{title}</Th>
            <Th width={40}>Permission</Th>
            <Th width={20}></Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((d) => (
            <Tr key={d.name}>
              <Td dataLabel={title}>{d.name}</Td>
              <Td dataLabel="Permission">{d.permission}</Td>
              <Td isActionCell>
                <ActionsColumn items={rowActions(d)} />
              </Td>
            </Tr>
          ))}
          {addRows.map((addRow, index) => (
            <PermissionListRow
              title={title}
              key={`add${title}-${index}`}
              index={index}
              row={addRow}
              handleNameChange={handleNameChange}
              handlePermissionSelection={handlePermissionSelection}
              handleSubmitRow={handleSubmitRow}
              handleRemoveRow={handleRemoveRow}
            />
          ))}
        </Tbody>
      </TableComposable>
      <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddRow}>
        {`Add ${type}`}
      </Button>
    </>
  );
});

PermissionList.displayName = 'PermissionList';

export default PermissionList;

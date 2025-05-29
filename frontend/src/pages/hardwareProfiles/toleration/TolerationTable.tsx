import React from 'react';
import { TableBase } from '#~/components/table';
import { Toleration } from '#~/types';
import TolerationTableRow from '#~/pages/hardwareProfiles/toleration/TolerationTableRow';
import ManageTolerationModal from '#~/pages/hardwareProfiles/toleration/ManageTolerationModal';
import { tolerationColumns } from './const';

type TolerationTableProps = {
  tolerations: Toleration[];
  onUpdate?: (tolerations: Toleration[]) => void;
};

const TolerationTable: React.FC<TolerationTableProps> = ({ tolerations, onUpdate }) => {
  const viewOnly = !onUpdate;
  const [editToleration, setEditToleration] = React.useState<Toleration | undefined>();
  const [currentIndex, setCurrentIndex] = React.useState<number | undefined>();

  return (
    <>
      <TableBase
        variant="compact"
        data-testid="hardware-profile-tolerations-table"
        id="hardware-profile-tolerations-table"
        data={tolerations}
        columns={
          viewOnly
            ? tolerationColumns.filter((column) => column.field !== 'actions')
            : tolerationColumns
        }
        rowRenderer={(cr, rowIndex) => (
          <TolerationTableRow
            toleration={cr}
            key={rowIndex}
            showActions={!viewOnly}
            onEdit={(toleration) => {
              setEditToleration(toleration);
              setCurrentIndex(rowIndex);
            }}
            onDelete={() => {
              const updatedTolerations = [...tolerations];
              updatedTolerations.splice(rowIndex, 1);
              onUpdate?.(updatedTolerations);
            }}
          />
        )}
      />
      {editToleration ? (
        <ManageTolerationModal
          existingToleration={editToleration}
          onClose={() => {
            setEditToleration(undefined);
            setCurrentIndex(undefined);
          }}
          onSave={(toleration) => {
            if (currentIndex !== undefined) {
              const updatedToleration = [...tolerations];
              updatedToleration[currentIndex] = toleration;
              onUpdate?.(updatedToleration);
            }
          }}
        />
      ) : null}
    </>
  );
};

export default TolerationTable;

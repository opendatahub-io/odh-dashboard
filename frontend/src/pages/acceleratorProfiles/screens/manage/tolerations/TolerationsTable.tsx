import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Table } from '#~/components/table';
import { Toleration } from '#~/types';
import { columns } from './const';
import TolerationRow from './TolerationRow';
import ManageTolerationModal from './ManageTolerationModal';

type TolerationTableProps = {
  tolerations: Toleration[];
  onUpdate: (tolerations: Toleration[]) => void;
};

export const TolerationsTable: React.FC<TolerationTableProps> = ({ tolerations, onUpdate }) => {
  const [editToleration, setEditToleration] = React.useState<Toleration | undefined>();
  const [currentIndex, setCurrentIndex] = React.useState<number | undefined>();

  if (tolerations.length === 0) {
    return (
      <EmptyState
        titleText="No tolerations"
        icon={PlusCircleIcon}
        headingLevel="h2"
        variant="xs"
        data-testid="tolerations-modal-empty-state"
      >
        <EmptyStateBody>
          Tolerations are applied to pods and allow the scheduler to schedule pods with matching
          taints.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Table
        data={tolerations}
        columns={columns}
        data-testid="toleration-table"
        rowRenderer={(toleration, rowIndex) => (
          <TolerationRow
            key={toleration.key + rowIndex}
            toleration={toleration}
            onEdit={(newToleration) => {
              setEditToleration(newToleration);
              setCurrentIndex(rowIndex);
            }}
            onDelete={() => {
              const updatedTolerations = [...tolerations];
              updatedTolerations.splice(rowIndex, 1);
              onUpdate(updatedTolerations);
            }}
          />
        )}
      />
      {editToleration ? (
        <ManageTolerationModal
          initialToleration={editToleration}
          onClose={() => {
            setEditToleration(undefined);
            setCurrentIndex(undefined);
          }}
          onSave={(toleration) => {
            if (currentIndex !== undefined) {
              const updatedTolerations = [...tolerations];
              updatedTolerations[currentIndex] = toleration;
              onUpdate(updatedTolerations);
            }
          }}
        />
      ) : null}
    </>
  );
};

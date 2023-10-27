import * as React from 'react';
import { Table } from '~/components/table';
import { getKServeInferenceServiceColumns } from '~/pages/modelServing/screens/global/data';
import KServeInferenceServiceTableRow from '~/pages/modelServing/screens/projects/KServeSection/KServeInferenceServiceTableRow';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

const KServeInferenceServiceTable: React.FC = () => {
  const {
    inferenceServices: { data: models },
  } = React.useContext(ProjectDetailsContext);

  return (
    <Table
      data={models}
      columns={getKServeInferenceServiceColumns()}
      disableRowRenderSupport
      defaultSortColumn={1}
      rowRenderer={(modelServer, rowIndex) => (
        <KServeInferenceServiceTableRow
          key={modelServer.metadata.uid}
          obj={modelServer}
          rowIndex={rowIndex}
        />
      )}
    />
  );
};

export default KServeInferenceServiceTable;

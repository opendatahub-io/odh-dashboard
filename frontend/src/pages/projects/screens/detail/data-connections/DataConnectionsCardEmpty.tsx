import * as React from 'react';
import ManageDataConnectionModal from '~/pages/projects/screens/detail/data-connections/ManageDataConnectionModal';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import EmptyComponentsCard from '~/pages/projects/screens/detail/EmptyComponentsCard';

type DataConnectionCardEmptyProps = {
  allowCreate: boolean;
};
const DataConnectionCardEmpty: React.FC<DataConnectionCardEmptyProps> = ({ allowCreate }) => {
  const { refreshAllProjectData } = React.useContext(ProjectDetailsContext);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <EmptyComponentsCard
        description="Adding a data connection to your project allows you to connect data inputs to your workbenches"
        allowCreate={allowCreate}
        onAction={() => setOpen(true)}
        createText="Add data connection"
      />
      <ManageDataConnectionModal
        isOpen={open}
        onClose={(submitted) => {
          if (submitted) {
            refreshAllProjectData();
          }
          setOpen(false);
        }}
      />
    </>
  );
};

export default DataConnectionCardEmpty;

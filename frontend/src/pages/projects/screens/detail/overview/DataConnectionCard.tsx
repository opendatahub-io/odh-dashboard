import * as React from 'react';
import { pluralize } from '@patternfly/react-core';
import ManageDataConnectionModal from '~/pages/projects/screens/detail/data-connections/ManageDataConnectionModal';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import emptyStateImg from '~/images/UI_icon-Red_Hat-Connected-RGB.svg';
import OverviewCard from './OverviewCard';

type DataConnectionCardProps = {
  allowCreate: boolean;
};
const DataConnectionCard: React.FC<DataConnectionCardProps> = ({ allowCreate }) => {
  const {
    dataConnections: { data: dataConnections, loaded, error },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <OverviewCard
        loading={!loaded}
        loadError={error}
        count={dataConnections.length}
        title={pluralize(dataConnections.length, 'Data connection', 'Data connections')}
        description="Connect data inputs to your workbenches."
        imgSrc={emptyStateImg}
        imgAlt="Data connections"
        allowCreate={allowCreate}
        onAction={() => setOpen(true)}
        createText="Add data connection"
        typeModifier="data-connections"
        navSection="data-connections"
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

export default DataConnectionCard;

import * as React from 'react';
import { ConfigurePipelinesServerModal } from '~/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import { PipelinesContext } from '~/concepts/pipelines/context/PipelinesContext';
import EmptyComponentsCard from '~/pages/projects/screens/detail/EmptyComponentsCard';

type PipelinesCardEmptyProps = {
  allowCreate: boolean;
};
const PipelinesCardEmpty: React.FC<PipelinesCardEmptyProps> = ({ allowCreate }) => {
  const [open, setOpen] = React.useState(false);
  const { refreshState } = React.useContext(PipelinesContext);

  return (
    <>
      <EmptyComponentsCard
        description="Standardize and automate machine learning workflows to enable you to further enchance and deploy your data science models."
        allowCreate={allowCreate}
        onAction={() => setOpen(true)}
        createText="Create pipeline"
      />
      <ConfigurePipelinesServerModal
        open={open}
        onClose={() => {
          setOpen(false);
          refreshState();
        }}
      />
    </>
  );
};

export default PipelinesCardEmpty;

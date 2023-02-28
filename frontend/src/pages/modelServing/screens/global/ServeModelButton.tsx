import * as React from 'react';
import { Button } from '@patternfly/react-core';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';

const ServeModelButton: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const {
    inferenceServices: { refresh },
  } = React.useContext(ModelServingContext);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Deploy model
      </Button>
      <ManageInferenceServiceModal
        isOpen={open}
        onClose={(submit) => {
          if (submit) {
            refresh();
          }
          setOpen(false);
        }}
      />
    </>
  );
};

export default ServeModelButton;

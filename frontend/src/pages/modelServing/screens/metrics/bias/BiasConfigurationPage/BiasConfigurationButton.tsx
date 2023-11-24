import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useModelBiasData } from '~/concepts/trustyai/context/useModelBiasData';
import { InferenceServiceKind } from '~/k8sTypes';
import ManageBiasConfigurationModal from '~/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationModal/ManageBiasConfigurationModal';

type BiasConfigurationButtonProps = {
  inferenceService: InferenceServiceKind;
};

const BiasConfigurationButton: React.FC<BiasConfigurationButtonProps> = ({ inferenceService }) => {
  const [isOpen, setOpen] = React.useState(false);
  const { biasMetricConfigs, loaded, refresh } = useModelBiasData();

  React.useEffect(() => {
    if (loaded && biasMetricConfigs.length === 0) {
      setOpen(true);
    }
  }, [loaded, biasMetricConfigs]);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">
        Configure metric
      </Button>
      <ManageBiasConfigurationModal
        isOpen={isOpen}
        onClose={(submit) => {
          if (submit) {
            refresh();
          }
          setOpen(false);
        }}
        inferenceService={inferenceService}
      />
    </>
  );
};

export default BiasConfigurationButton;

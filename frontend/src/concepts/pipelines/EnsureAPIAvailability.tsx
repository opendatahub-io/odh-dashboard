import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal.tsx';

type EnsureAPIAvailabilityProps = {
  children: React.ReactNode;
  isPipeline?: boolean;
};

// if isInitialized but not ready, show spinner; if isNot initialized then show new status
const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({
  isPipeline = false,
  children,
}) => {
  const { apiAvailable, pipelinesServer } = usePipelinesAPI();
  const [showModal, setShowModal] = React.useState(false);
  console.log('46a: hi there');
  // Show modal when starting begins
  React.useEffect(() => {
    console.log('46a in useEffect; ', pipelinesServer.isStarting);
    if (pipelinesServer.isStarting) {
      console.log('46a showing modal!');
      setShowModal(true);
    }
    console.log('yawn 46a');
  }, [pipelinesServer.isStarting]);

  const pipelineSpinner = (
    <div>
      <Bullseye style={{ minHeight: 150 }} data-testid="pipelines-api-not-available">
        <div>
          Initializing Pipeline Server
          <Spinner />{' '}
        </div>
      </Bullseye>
      This may take a while
    </div>
  );

  const getMainComponent = () => {
    if (isPipeline) {
      if (pipelinesServer.isStarting || (!apiAvailable && pipelinesServer.compatible)) {
        return pipelineSpinner;
      }
    }
    if (!apiAvailable && pipelinesServer.compatible) {
      return (
        <Bullseye style={{ minHeight: 150 }} data-testid="pipelines-api-not-available">
          <Spinner />
        </Bullseye>
      );
    }
    return children;
  };
  console.log('46a showing modal???', showModal);
  return (
    <>
      {getMainComponent()}
      {showModal && <StartingStatusModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default EnsureAPIAvailability;

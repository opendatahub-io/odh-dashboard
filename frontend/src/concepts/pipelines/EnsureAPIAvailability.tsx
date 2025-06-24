import * as React from 'react';
import { Bullseye, Spinner, Button, Flex, FlexItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal.tsx';
import './EnsureAPIAvailability.scss';

type EnsureAPIAvailabilityProps = {
  children: React.ReactNode;
};

const spinningText = 'Initializing Pipeline Server';

// if isInitialized but not ready, show spinner; if isNot initialized then show new status
const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({ children }) => {
  const { apiAvailable, pipelinesServer } = usePipelinesAPI();
  const [showModal, setShowModal] = React.useState(false);

  const modalLink = (
    <Button
      data-testid="open-pipeline-status-link"
      variant="link"
      isInline
      onClick={() => {
        setShowModal(true);
      }}
    >
      {spinningText}
    </Button>
  );

  const makePipelineSpinner = (isStarting: boolean) => {
    const contents = isStarting ? modalLink : spinningText;

    return (
      <div>
        <Bullseye
          className="ensure-api-availability__spinner-container"
          data-testid="pipelines-api-not-available"
        >
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
            <FlexItem>
              <div className="ensure-api-availability__spinner-content">
                <Spinner size="md" className="ensure-api-availability__spinner-icon" />
                {contents}
              </div>
            </FlexItem>
            <FlexItem>
              <div className="ensure-api-availability__wait-message">This may take a while</div>
            </FlexItem>
          </Flex>
        </Bullseye>
      </div>
    );
  };

  const getMainComponent = () => {
    const { isStarting, compatible } = pipelinesServer;

    if (isStarting) {
      return makePipelineSpinner(!!isStarting);
    }

    if (!apiAvailable && compatible) {
      return (
        <Bullseye
          className="ensure-api-availability__spinner-container"
          data-testid="pipelines-api-not-available"
        >
          <Spinner />
        </Bullseye>
      );
    }
    return children;
  };
  return (
    <>
      {getMainComponent()}
      {showModal && <StartingStatusModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default EnsureAPIAvailability;

import * as React from 'react';
import { Alert, AlertProps, Label, Popover } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ServingRuntimeVersionStatusLabel } from './const';

type ServingRuntimeVersionStatusProps = {
  isOutdated?: boolean;
  version: string;
  templateVersion: string;
};

const ServingRuntimeVersionStatus: React.FC<ServingRuntimeVersionStatusProps> = ({
  isOutdated,
  version,
  templateVersion,
}) => {
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const getPopoverText = (): {
    title: string;
    body: React.ReactNode;
    variant: AlertProps['variant'];
  } => {
    if (isOutdated) {
      return {
        title: 'Outdated',
        body: (
          <p>
            A newer version of this serving runtime is available. To use the newest version, you
            must create a new model deployment.
            <br />
            <strong>Current version:</strong> {version}
            <br />
            <strong>Newest version:</strong> {templateVersion}
          </p>
        ),
        variant: 'warning',
      };
    }
    return {
      title: 'Latest',
      body: <p>This is the most recent serving runtime version.</p>,
      variant: 'success',
    };
  };
  const { title, body, variant } = getPopoverText();
  return (
    <>
      <Popover
        isVisible={isPopoverVisible}
        shouldOpen={() => setIsPopoverVisible(true)}
        shouldClose={() => setIsPopoverVisible(false)}
        headerContent={<Alert variant={variant} isInline isPlain title={title} />}
        bodyContent={body}
      >
        <Label
          data-testid="serving-runtime-version-status-label"
          color={isOutdated ? 'yellow' : 'green'}
          icon={isOutdated ? <ExclamationTriangleIcon /> : <CheckCircleIcon />}
          isCompact
        >
          {isOutdated
            ? ServingRuntimeVersionStatusLabel.OUTDATED
            : ServingRuntimeVersionStatusLabel.LATEST}
        </Label>
      </Popover>
    </>
  );
};
export default ServingRuntimeVersionStatus;

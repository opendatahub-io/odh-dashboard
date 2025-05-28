import {
  Popover,
  Spinner,
  Flex,
  FlexItem,
  Label,
  Alert,
  AlertProps,
  LabelProps,
  ContentVariants,
  HelperText,
  HelperTextItem,
  Button,
  Tooltip,
  Timestamp,
  TooltipPosition,
} from '@patternfly/react-core';
import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import { NotebookImageAvailability, NotebookImageStatus } from './const';
import { NotebookImage } from './types';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import {
  getImageVersionBuildDate,
  getImageVersionSoftwareString,
  getMatchingImageStreamStatusTag,
} from '#~/pages/projects/screens/spawner/spawnerUtils';
import { NotebookState } from '#~/pages/projects/notebook/types';
import UnderlinedTruncateButton from '#~/components/UnderlinedTruncateButton';
import { NotebookKind } from '#~/k8sTypes';
import ScopedLabel from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';

type NotebookImageDisplayNameProps = {
  notebook: NotebookKind;
  notebookImage: NotebookImage | null;
  notebookState: NotebookState;
  loaded: boolean;
  loadError?: Error;
  isExpanded?: boolean;
  onUpdateImageClick: () => void;
  isUpdating: boolean;
  setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
};

export const NotebookImageDisplayName = ({
  notebook,
  notebookImage,
  notebookState,
  loaded,
  loadError,
  isExpanded,
  onUpdateImageClick,
  isUpdating,
  setIsUpdating,
}: NotebookImageDisplayNameProps): React.JSX.Element => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const { isStarting, isRunning, isStopping } = notebookState;
  const [isRestarting, setIsRestarting] = React.useState(false);

  React.useEffect(() => {
    if (isUpdating && isRunning && isRestarting) {
      setIsUpdating(false);
    } else if (isUpdating && (isStarting || isStopping)) {
      setIsRestarting(true);
    }
  }, [isStarting, isRunning, isStopping, isUpdating, setIsUpdating, isRestarting]);

  // if there was an error loading the image, display unknown WITHOUT a label
  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="error">Unknown</HelperTextItem>
      </HelperText>
    );
  }
  // If the image is not loaded, display a spinner
  if (!loaded || !notebookImage) {
    return <Spinner size="md" />;
  }

  const updateToLatestButton = (
    <Button
      data-testid="update-latest-version-button"
      variant="link"
      onClick={() => {
        setIsPopoverVisible(false);
        onUpdateImageClick();
      }}
    >
      Update to the latest version
    </Button>
  );

  // helper function to get the popover variant and text
  const getNotebookImagePopoverText = ():
    | Record<string, never>
    | {
        title: string;
        body: React.ReactNode;
        variant: AlertProps['variant'];
        footer?: React.ReactNode;
      } => {
    if (notebookImage.imageStatus === NotebookImageStatus.DELETED) {
      return {
        title: 'Notebook image deleted',
        body: (
          <p>
            This image version has been deleted. To continue using this workbench, select an
            available version or a different workbench image.
          </p>
        ),
        variant: 'danger',
        footer: updateToLatestButton,
      };
    }
    if (notebookImage.imageAvailability === NotebookImageAvailability.DISABLED) {
      return {
        title: 'Notebook image disabled',
        body: (
          <p>
            This image version is disabled. This workbench can continue using this version, but new
            workbenches cannot use it.
          </p>
        ),
        variant: 'warning',
      };
    }
    if (notebookImage.imageStatus === NotebookImageStatus.DEPRECATED) {
      return {
        title: 'Notebook image deprecated',
        body: (
          <p>
            This image version is deprecated. This workbench can continue using this version, but
            the workbench will not receive new version updates.
          </p>
        ),
        variant: 'warning',
        footer: updateToLatestButton,
      };
    }
    return {
      title: 'Latest image version',
      body: (
        <p>
          This image is the latest version of the <b>{notebookImage.imageDisplayName}</b> notebook
          image in this version of {ODH_PRODUCT_NAME}.
        </p>
      ),
      variant: 'success',
    };
  };

  // helper function to get the label color
  const getNotebookImageLabelColor = (): LabelProps['color'] => {
    if (notebookImage.imageStatus === NotebookImageStatus.DELETED) {
      return 'red';
    }
    if (
      notebookImage.imageAvailability === NotebookImageAvailability.DISABLED ||
      notebookImage.imageStatus === NotebookImageStatus.DEPRECATED
    ) {
      return 'yellow';
    }
    if (notebookImage.imageStatus === NotebookImageStatus.LATEST) {
      return 'green';
    }
    return 'grey';
  };

  // helper function to get the label icon
  const getNotebookImageIcon = (): LabelProps['icon'] => {
    if (notebookImage.imageStatus === NotebookImageStatus.DELETED) {
      return <ExclamationCircleIcon />;
    }
    if (
      notebookImage.imageAvailability === NotebookImageAvailability.DISABLED ||
      notebookImage.imageStatus === NotebookImageStatus.DEPRECATED
    ) {
      return <ExclamationTriangleIcon />;
    }
    if (notebookImage.imageStatus === NotebookImageStatus.LATEST) {
      return <CheckCircleIcon />;
    }
    return <InfoCircleIcon />;
  };

  // get the popover title, body, and variant based on the image availability
  const { title, body, variant, footer } = getNotebookImagePopoverText();

  const imageBuildDate =
    notebookImage.imageStatus !== NotebookImageStatus.DELETED
      ? getImageVersionBuildDate(
          notebookImage.imageVersion,
          getMatchingImageStreamStatusTag(notebookImage.imageStream, notebookImage.imageVersion),
        )
      : undefined;

  const imageVersionSoftwareString =
    notebookImage.imageStatus !== NotebookImageStatus.DELETED
      ? getImageVersionSoftwareString(notebookImage.imageVersion)
      : undefined;

  // Prepare the version display string for the Truncate content
  const versionDisplayString =
    notebookImage.imageStatus !== NotebookImageStatus.DELETED
      ? `${notebookImage.imageVersion.name}${
          notebookImage.imageVersion.annotations?.['opendatahub.io/notebook-build-commit']
            ? ` (${notebookImage.imageVersion.annotations['opendatahub.io/notebook-build-commit']})`
            : ''
        }`
      : '';

  return (
    <>
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <HelperText>
            <HelperTextItem
              data-testid="image-display-name"
              variant={notebookImage.imageDisplayName ? 'default' : 'indeterminate'}
            >
              {notebookImage.imageDisplayName || 'unknown'}
            </HelperTextItem>
          </HelperText>
        </FlexItem>
        <FlexItem>
          {notebookImage.imageStatus !== NotebookImageStatus.DELETED &&
            notebookImage.imageAvailability === NotebookImageAvailability.ENABLED &&
            isProjectScopedAvailable &&
            notebook.metadata.annotations?.['opendatahub.io/workbench-image-namespace'] && (
              <ScopedLabel isProject color="blue" isCompact>
                {ScopedType.Project}
              </ScopedLabel>
            )}
        </FlexItem>
      </Flex>
      <Flex flexWrap={{ default: 'nowrap' }}>
        {isExpanded && notebookImage.imageStatus !== NotebookImageStatus.DELETED && (
          <FlexItem>
            <Popover
              data-testid="notebook-image-version-popover"
              headerContent={
                notebookImage.imageStream.metadata.annotations?.[
                  'opendatahub.io/notebook-image-name'
                ] ?? notebookImage.imageStream.metadata.name
              }
              bodyContent={
                <>
                  <div data-testid="notebook-image-version-name">
                    Version: {notebookImage.imageVersion.name}
                  </div>
                  {notebookImage.imageVersion.annotations?.[
                    'opendatahub.io/notebook-build-commit'
                  ] && (
                    <div data-testid="notebook-image-version-build-commit">
                      Build Commit:{' '}
                      {
                        notebookImage.imageVersion.annotations[
                          'opendatahub.io/notebook-build-commit'
                        ]
                      }
                    </div>
                  )}
                  {imageBuildDate && (
                    <div data-testid="notebook-image-version-build-date">
                      Build Date: <Timestamp date={new Date(imageBuildDate)} shouldDisplayUTC />
                    </div>
                  )}
                  {imageVersionSoftwareString && (
                    <div data-testid="notebook-image-version-software">
                      Software: {imageVersionSoftwareString}
                    </div>
                  )}
                </>
              }
              position="right"
              triggerAction="hover"
            >
              <UnderlinedTruncateButton
                content={versionDisplayString}
                truncateProps={{ tooltipPosition: TooltipPosition.left }}
                contentProps={{ component: ContentVariants.small }}
                data-testid="notebook-image-version-link"
              />
            </Popover>
          </FlexItem>
        )}
        {isUpdating && (
          <FlexItem>
            <Tooltip content="Updating version" data-testid="updating-image-icon-tooltip">
              <InProgressIcon
                className="odh-u-spin"
                style={{ cursor: 'pointer' }}
                data-testid="updating-image-icon"
              />
            </Tooltip>
          </FlexItem>
        )}
        {!isUpdating && (
          <FlexItem>
            {(notebookImage.imageStatus === NotebookImageStatus.DELETED ||
              notebookImage.imageAvailability === NotebookImageAvailability.DISABLED ||
              notebookImage.imageStatus === NotebookImageStatus.LATEST ||
              notebookImage.imageStatus === NotebookImageStatus.DEPRECATED) && (
              <Popover
                aria-label="Image display name popover"
                headerContent={<Alert variant={variant} isInline isPlain title={title} />}
                bodyContent={body}
                footerContent={footer}
                shouldOpen={() => setIsPopoverVisible(true)}
                shouldClose={() => setIsPopoverVisible(false)}
                isVisible={isPopoverVisible}
              >
                <Label
                  onClick={(e) => e.preventDefault()}
                  data-testid="notebook-image-availability"
                  isCompact
                  color={getNotebookImageLabelColor()}
                  icon={getNotebookImageIcon()}
                >
                  {notebookImage.imageStatus || NotebookImageAvailability.DISABLED}
                </Label>
              </Popover>
            )}
          </FlexItem>
        )}
      </Flex>
    </>
  );
};

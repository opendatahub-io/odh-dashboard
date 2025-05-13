import {
  Popover,
  Spinner,
  Flex,
  FlexItem,
  Label,
  Content,
  Alert,
  AlertProps,
  LabelProps,
  ContentVariants,
  HelperText,
  HelperTextItem,
  Button,
} from '@patternfly/react-core';
import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import { ProjectObjectType } from '~/concepts/design/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';
import { NotebookImageAvailability, NotebookImageStatus } from './const';
import { NotebookImage } from './types';

type NotebookImageDisplayNameProps = {
  isImageStreamProjectScoped: boolean;
  notebookImage: NotebookImage | null;
  loaded: boolean;
  loadError?: Error;
  isExpanded?: boolean;
  onUpdateImageClick: () => void;
};

export const NotebookImageDisplayName = ({
  isImageStreamProjectScoped,
  notebookImage,
  loaded,
  loadError,
  isExpanded,
  onUpdateImageClick,
}: NotebookImageDisplayNameProps): React.JSX.Element => {
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);

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

  // otherwise, return the popover with the label as the trigger
  return (
    <>
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
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
            isImageStreamProjectScoped && (
              <Label
                isCompact
                variant="outline"
                color="blue"
                data-testid="project-scoped-label"
                icon={<TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />}
              >
                Project-scoped
              </Label>
            )}
        </FlexItem>
        {(notebookImage.imageStatus === NotebookImageStatus.DELETED ||
          notebookImage.imageAvailability === NotebookImageAvailability.DISABLED ||
          notebookImage.imageStatus === NotebookImageStatus.LATEST ||
          notebookImage.imageStatus === NotebookImageStatus.DEPRECATED) && (
          <FlexItem>
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
          </FlexItem>
        )}
      </Flex>
      {isExpanded && notebookImage.imageStatus !== NotebookImageStatus.DELETED && (
        <Content component={ContentVariants.small}>{notebookImage.tagSoftware}</Content>
      )}
    </>
  );
};

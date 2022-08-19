import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  PageSectionVariants,
  Title,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { useWatchBYONImages } from '../../utilities/useWatchBYONImages';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ImportImageModal } from './ImportImageModal';
import { BYONImagesTable } from './BYONImagesTable';

const description = `Import, delete, and modify notebook images.`;

const BYONImages: React.FC = () => {
  const [importImageModalVisible, setImportImageModalVisible] = React.useState<boolean>(false);

  const { images, loaded, loadError, forceUpdate } = useWatchBYONImages();
  const isEmpty = !images || images.length === 0;

  const noImagesPageSection = (
    <PageSection isFilled>
      <EmptyState variant={EmptyStateVariant.full} data-test-id="empty-empty-state">
        <EmptyStateIcon icon={PlusCircleIcon} />
        <Title headingLevel="h5" size="lg">
          No custom notebook images found.
        </Title>
        <EmptyStateBody>To get started import a custom notebook image.</EmptyStateBody>
        <Button
          variant={ButtonVariant.primary}
          onClick={() => {
            setImportImageModalVisible(true);
          }}
        >
          Import image
        </Button>
      </EmptyState>
      <ImportImageModal
        isOpen={importImageModalVisible}
        onCloseHandler={() => {
          setImportImageModalVisible(false);
        }}
        onImportHandler={forceUpdate}
      />
    </PageSection>
  );

  return (
    <ApplicationsPage
      title="Notebook image settings"
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
      errorMessage="Unable to load notebook images."
      emptyStatePage={noImagesPageSection}
    >
      {!isEmpty ? (
        <div className="odh-cluster-settings">
          <PageSection variant={PageSectionVariants.light} padding={{ default: 'noPadding' }}>
            <Flex direction={{ default: 'column' }}>
              <FlexItem>
                {' '}
                <BYONImagesTable images={images} forceUpdate={forceUpdate} />
              </FlexItem>
            </Flex>
          </PageSection>
        </div>
      ) : null}
    </ApplicationsPage>
  );
};

export default BYONImages;

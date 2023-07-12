import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportBYONImageButton from './ImportBYONImageButton';

type EmptyBYONImagesProps = {
  refresh: () => void;
};

const EmptyBYONImages: React.FC<EmptyBYONImagesProps> = ({ refresh }) => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.full} data-id="empty-empty-state">
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h5" size="lg">
        No custom notebook images found.
      </Title>
      <EmptyStateBody>To get started import a custom notebook image.</EmptyStateBody>
      <ImportBYONImageButton refresh={refresh} />
    </EmptyState>
  </PageSection>
);

export default EmptyBYONImages;

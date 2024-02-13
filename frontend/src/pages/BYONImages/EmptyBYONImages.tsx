import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportBYONImageButton from './ImportBYONImageButton';

type EmptyBYONImagesProps = {
  refresh: () => void;
};

const EmptyBYONImages: React.FC<EmptyBYONImagesProps> = ({ refresh }) => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.full} data-id="empty-empty-state">
      <EmptyStateHeader
        titleText="No custom notebook images found."
        icon={<EmptyStateIcon icon={PlusCircleIcon} />}
        headingLevel="h1"
      />
      <EmptyStateBody>To get started import a custom notebook image.</EmptyStateBody>
      <EmptyStateFooter>
        <ImportBYONImageButton refresh={refresh} />
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default EmptyBYONImages;

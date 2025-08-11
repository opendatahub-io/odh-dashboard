import React from 'react';
import { Label, LabelGroup, Popover } from '@patternfly/react-core';
import FeatureStoreLabels from './FeatureStoreLabels';

type FeatureStoreTagsProps = {
  showAllTags?: boolean;
  tags: Record<string, string>;
  threshold?: number;
};

type FeatureStoreTagsGroupProps = {
  dataTestId?: string;
  numLabels: number;
  tags: [string, string][];
  textMaxWidth?: string;
};

const renderLabel = (key: string, value: string, textMaxWidth?: string) => (
  <FeatureStoreLabels
    color="blue"
    dataTestId="feature-store-label"
    isCompact={false}
    key={key}
    textMaxWidth={textMaxWidth}
    variant="filled"
  >
    {key} = {value}
  </FeatureStoreLabels>
);

const FeatureStoreTagsGroup: React.FC<FeatureStoreTagsGroupProps> = ({
  dataTestId = 'feature-store-tags-group',
  numLabels,
  tags,
  textMaxWidth,
}) => (
  <LabelGroup numLabels={numLabels} data-testid={dataTestId}>
    {tags.map(([key, value]) => renderLabel(key, value, textMaxWidth))}
  </LabelGroup>
);

const FeatureStoreTags: React.FC<FeatureStoreTagsProps> = ({
  tags,
  showAllTags = false,
  threshold = 3,
}) => {
  const tagEntries = Object.entries(tags);
  const totalTagsCount = tagEntries.length;
  const textMaxWidth = showAllTags ? '100ch' : '20ch';

  if (totalTagsCount === 0) {
    return '-';
  }

  if (showAllTags) {
    return (
      <FeatureStoreTagsGroup
        numLabels={totalTagsCount}
        tags={tagEntries}
        textMaxWidth={textMaxWidth}
      />
    );
  }

  const visibleTags = tagEntries.slice(0, threshold);
  const overflowTags = tagEntries.slice(threshold);
  const overflowCount = overflowTags.length;

  return (
    <>
      <FeatureStoreTagsGroup
        numLabels={totalTagsCount}
        tags={visibleTags}
        textMaxWidth={textMaxWidth}
      />
      {overflowCount > 0 && (
        <Popover
          bodyContent={
            <FeatureStoreTagsGroup
              dataTestId="popover-label-group"
              numLabels={overflowCount}
              tags={overflowTags}
              textMaxWidth={textMaxWidth}
            />
          }
        >
          <Label data-testid="popover-label-text" variant="overflow">
            {overflowCount} more
          </Label>
        </Popover>
      )}
    </>
  );
};

export default FeatureStoreTags;

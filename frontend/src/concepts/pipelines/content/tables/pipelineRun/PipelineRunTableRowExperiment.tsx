import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Label, Skeleton, Split, SplitItem } from '@patternfly/react-core';
import TruncatedText from '#~/components/TruncatedText';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { NoRunContent } from '#~/concepts/pipelines/content/tables/renderUtils';

type PipelineRunTableRowExperimentProps = {
  experiment?: ExperimentKF | null;
  isExperimentArchived?: boolean;
  loaded: boolean;
  error?: Error;
  linkTo?: string;
  isClickable?: boolean;
  onClick?: () => void;
};

const PipelineRunTableRowExperiment: React.FC<PipelineRunTableRowExperimentProps> = ({
  experiment,
  isExperimentArchived,
  loaded,
  error,
  linkTo,
  isClickable = false,
  onClick,
}) => {
  const navigate = useNavigate();

  if (!loaded && !error) {
    return <Skeleton />;
  }

  if (!experiment) {
    return <NoRunContent />;
  }

  const handleClick = onClick ?? (linkTo ? () => navigate(linkTo) : undefined);
  const showClickableStyles = isClickable || !!handleClick;

  const runGroupLabel = (
    <Label
      {...(showClickableStyles
        ? {
            isClickable: true,
            ...(handleClick ? { onClick: handleClick } : {}),
          }
        : {})}
      isCompact
      variant="outline"
    >
      <TruncatedText content={experiment.display_name} maxLines={1} />
    </Label>
  );

  return (
    <Split hasGutter>
      <SplitItem>{runGroupLabel}</SplitItem>
      {isExperimentArchived && (
        <SplitItem>
          <Label variant="outline" isCompact>
            Archived
          </Label>
        </SplitItem>
      )}
    </Split>
  );
};

export default PipelineRunTableRowExperiment;

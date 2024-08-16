import * as React from 'react';
import { Text } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import MarkdownView from '~/components/MarkdownView';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';

type TableRowTitleDescriptionProps = {
  title: React.ReactNode;
  resource?: K8sResourceCommon;
  subtitle?: React.ReactNode;
  description?: string;
  descriptionAsMarkdown?: boolean;
  label?: React.ReactNode;
};

const TableRowTitleDescription: React.FC<TableRowTitleDescriptionProps> = ({
  title,
  description,
  resource,
  subtitle,
  descriptionAsMarkdown,
  label,
}) => {
  let descriptionNode: React.ReactNode;
  if (description) {
    descriptionNode = descriptionAsMarkdown ? (
      <MarkdownView conciseDisplay markdown={description} />
    ) : (
      <Text
        data-testid="table-row-title-description"
        style={{ color: 'var(--pf-v5-global--Color--200)' }}
      >
        {description}
      </Text>
    );
  }

  return (
    <>
      <b data-testid="table-row-title">
        {resource ? <ResourceNameTooltip resource={resource}>{title}</ResourceNameTooltip> : title}
      </b>
      {subtitle}
      {descriptionNode}
      {label}
    </>
  );
};

export default TableRowTitleDescription;

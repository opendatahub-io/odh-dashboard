import * as React from 'react';
import { Text, Title } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import MarkdownView from '~/components/MarkdownView';
import ResourceNameTooltip from './ResourceNameTooltip';

type TableRowTitleDescriptionProps = {
  title: React.ReactNode;
  resource?: K8sResourceCommon;
  description?: string;
  descriptionAsMarkdown?: boolean;
};

const TableRowTitleDescription: React.FC<TableRowTitleDescriptionProps> = ({
  title,
  description,
  resource,
  descriptionAsMarkdown,
}) => {
  let descriptionNode: React.ReactNode;
  if (description) {
    descriptionNode = descriptionAsMarkdown ? (
      <MarkdownView conciseDisplay markdown={description} />
    ) : (
      <Text>{description}</Text>
    );
  }

  return (
    <>
      <Title headingLevel="h3" size="md">
        {resource ? <ResourceNameTooltip resource={resource}>{title}</ResourceNameTooltip> : title}
      </Title>
      {descriptionNode}
    </>
  );
};

export default TableRowTitleDescription;

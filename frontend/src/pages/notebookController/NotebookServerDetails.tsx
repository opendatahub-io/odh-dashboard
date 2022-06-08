import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Text,
  TextVariants,
} from '@patternfly/react-core';

const NotebookServerDetails: React.FC = () => {
  const [isExpanded, setExpanded] = React.useState(false);

  const onToggle = (expanded: boolean) => setExpanded(expanded);

  return (
    <ExpandableSection
      className="odh-notebook-controller__server-details"
      toggleText="Notebook server details"
      onToggle={onToggle}
      isExpanded={isExpanded}
      isIndented
    >
      <p className="odh-notebook-controller__server-details-title">Notebook image</p>
      <div className="odh-notebook-controller__server-details-image-name">
        <p>Standard data science</p>
        <Text component={TextVariants.small}>Python v3.8.7</Text>
      </div>
      <DescriptionList>
        <DescriptionListGroup>
          <DescriptionListTerm>Packages</DescriptionListTerm>
          <DescriptionListDescription>
            <p>Boto3 v1.16.59</p>
            <p>Boto3 v1.16.59</p>
            <p>Boto3 v1.16.59</p>
            <p>Boto3 v1.16.59</p>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
      <p className="odh-notebook-controller__server-details-title">Deployment size</p>
      <DescriptionList isCompact>
        <DescriptionListGroup>
          <DescriptionListTerm>Container size</DescriptionListTerm>
          <DescriptionListDescription>Default</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Limits</DescriptionListTerm>
          <DescriptionListDescription>6 CPU, 24Gi</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Memory Requests</DescriptionListTerm>
          <DescriptionListDescription>3 CPU, 24Gi Memory</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Number of GPUs</DescriptionListTerm>
          <DescriptionListDescription>0</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </ExpandableSection>
  );
};

NotebookServerDetails.displayName = 'NotebookServerDetails';

export default NotebookServerDetails;

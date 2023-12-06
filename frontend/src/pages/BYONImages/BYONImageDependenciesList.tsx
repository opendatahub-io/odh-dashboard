import * as React from 'react';
import {
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Text,
  TextContent,
} from '@patternfly/react-core';

type BYONImageDependenciesListProps = {
  dependencies: string[];
  term: string;
};

const BYONImageDependenciesList: React.FC<BYONImageDependenciesListProps> = ({
  term,
  dependencies,
}) => {
  if (dependencies.length === 0) {
    return null;
  }

  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{term}</DescriptionListTerm>
      <DescriptionListDescription>
        <TextContent>
          {dependencies.map((dep, i) => (
            <Text style={{ marginBottom: 0 }} key={i} component="small">
              {dep}
            </Text>
          ))}
        </TextContent>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export default BYONImageDependenciesList;

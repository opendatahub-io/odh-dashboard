import * as React from 'react';
import { Content, ContentVariants, Title } from '@patternfly/react-core';

type BaseSectionProps = React.PropsWithChildren<{
  title: string;
  useH3?: boolean;
}>;

export const BaseSection: React.FC<BaseSectionProps> = ({ children, title, useH3 = false }) => {
  const actualTitle = useH3 ? <Title headingLevel="h3">{title}</Title> : title;

  return (
    <>
      <Content
        component={ContentVariants.p}
        className="pf-v6-u-font-weight-bold"
        style={{
          marginTop: 'var(--pf-t--global--spacer--md)',
        }}
      >
        {actualTitle}
      </Content>
      {children}
    </>
  );
};

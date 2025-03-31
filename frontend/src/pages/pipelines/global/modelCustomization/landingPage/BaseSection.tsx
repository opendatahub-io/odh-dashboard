import * as React from 'react';
import { Content, ContentVariants } from '@patternfly/react-core';

type BaseSectionProps = React.PropsWithChildren<{
  title: string;
}>;

export const BaseSection: React.FC<BaseSectionProps> = ({ children, title }) => (
  <>
    <Content
      component={ContentVariants.p}
      className="pf-v6-u-font-weight-bold"
      style={{
        marginLeft: 'var(--pf-t--global--spacer--md)',
        marginTop: 'var(--pf-t--global--spacer--md)',
      }}
    >
      {title}
    </Content>
    {children}
  </>
);

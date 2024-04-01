import * as React from 'react';
import { Card, CardTitle, CardHeader, Divider } from '@patternfly/react-core';

export const DWSectionCard: React.FC<{
  title: string;
  hasDivider?: boolean;
  content: React.ReactNode;
}> = ({ title, hasDivider = true, content }) => (
  <Card isFullHeight className="dw-section-card">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    {hasDivider && <Divider />}
    {content}
  </Card>
);

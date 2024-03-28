import * as React from 'react';
import { Card, CardTitle, CardHeader, Divider } from '@patternfly/react-core';

export const DWSectionCard: React.FC<{ title: string; content: React.ReactNode }> = ({
  title,
  content,
}) => (
  <Card isFullHeight className="dw-section-card">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <Divider />
    <Card>{content}</Card>
  </Card>
);

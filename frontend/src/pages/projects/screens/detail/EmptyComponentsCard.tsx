import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';

type EmptyComponentsCardProps = {
  title?: string;
  description?: string;
  allowCreate: boolean;
  onAction?: () => void;
  createText?: string;
};
const EmptyComponentsCard: React.FC<EmptyComponentsCardProps> = ({
  title,
  description,
  allowCreate,
  onAction,
  createText,
}) => (
  <div className="odh-project-details__card m-is-empty">
    <EmptyDetailsView
      title={title}
      description={description}
      allowCreate={allowCreate}
      createButton={
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onAction && onAction();
          }}
          variant="secondary"
        >
          {createText}
        </Button>
      }
    />
  </div>
);

export default EmptyComponentsCard;

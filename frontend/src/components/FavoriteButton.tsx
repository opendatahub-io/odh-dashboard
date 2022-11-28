import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { StarIcon } from '@patternfly/react-icons';
import classNames from 'classnames';

import './FavoriteButton.scss';

type FavoriteButtonProps = {
  isFavorite: boolean;
  onClick: () => void;
};

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ isFavorite, onClick }) => {
  return (
    <Button variant="plain" style={{ padding: 0 }} onClick={onClick}>
      <StarIcon
        className={classNames('favorite-button', {
          'm-selected': isFavorite,
        })}
      />
    </Button>
  );
};

export default FavoriteButton;

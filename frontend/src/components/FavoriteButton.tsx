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
    <Button variant="plain" className="odh-favorite-button" onClick={onClick}>
      <StarIcon
        className={classNames('odh-favorite-button__star-icon', {
          'odh-favorite-button__star-icon--is-selected': isFavorite,
        })}
      />
    </Button>
  );
};

export default FavoriteButton;

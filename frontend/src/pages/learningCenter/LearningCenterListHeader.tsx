import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowsAltVIcon, LongArrowAltDownIcon, LongArrowAltUpIcon } from '@patternfly/react-icons';
import { setQueryArgument } from '~/utilities/router';
import { useQueryParams } from '~/utilities/useQueryParams';
import {
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  SORT_TYPE_NAME,
  SORT_ASC,
  SORT_TYPE_TYPE,
  SORT_DESC,
  SORT_TYPE_APPLICATION,
  SORT_TYPE_DURATION,
} from './const';

const LearningCenterListHeaders: React.FC = () => {
  const navigate = useNavigate();
  const queryParams = useQueryParams();
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;

  const onSortSelect = React.useCallback(
    (currentSortType: string, ascending: boolean) => {
      setQueryArgument(navigate, DOC_SORT_KEY, currentSortType);
      setQueryArgument(navigate, DOC_SORT_ORDER_KEY, ascending ? SORT_ASC : SORT_DESC);
    },
    [navigate],
  );

  const renderSortArrow = (field: string) => {
    if (sortType !== field) {
      return (
        <ArrowsAltVIcon
          data-testid={`sort-icon ${field}`}
          className="odh-learning-paths__list-view__header__no-sort"
          onClick={() => onSortSelect(field, true)}
        />
      );
    }
    if (sortOrder === SORT_ASC) {
      return (
        <LongArrowAltDownIcon
          onClick={() => onSortSelect(field, false)}
          data-testid={`sort-down-icon ${field}`}
        />
      );
    }
    return (
      <LongArrowAltUpIcon
        onClick={() => onSortSelect(field, true)}
        data-testid={`sort-up-icon ${field}`}
      />
    );
  };

  return (
    <>
      <div className="odh-learning-paths__list-view__header" />
      <div className="odh-learning-paths__list-view__header">
        Name
        {renderSortArrow(SORT_TYPE_NAME)}
      </div>
      <div className="odh-learning-paths__list-view__header">
        Application
        {renderSortArrow(SORT_TYPE_APPLICATION)}
      </div>
      <div className="odh-learning-paths__list-view__header">
        Type
        {renderSortArrow(SORT_TYPE_TYPE)}
      </div>
      <div className="odh-learning-paths__list-view__header">
        Length
        {renderSortArrow(SORT_TYPE_DURATION)}
      </div>
      <div className="odh-learning-paths__list-view__header" />
    </>
  );
};

export default LearningCenterListHeaders;

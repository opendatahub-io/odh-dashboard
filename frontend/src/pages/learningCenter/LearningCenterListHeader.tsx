import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowsAltVIcon, LongArrowAltDownIcon, LongArrowAltUpIcon } from '@patternfly/react-icons';
import { setQueryArgument } from '#~/utilities/router';
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
  const [searchParams] = useSearchParams();
  const sortType = searchParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = searchParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;

  const onSortSelect = React.useCallback(
    (currentSortType: string, ascending: boolean) => {
      setQueryArgument(navigate, DOC_SORT_KEY, currentSortType);
      setQueryArgument(navigate, DOC_SORT_ORDER_KEY, ascending ? SORT_ASC : SORT_DESC);
    },
    [navigate],
  );

  // Note from PatternFly: These sort icons needs to be in a button; currently not accessible to keyboard or other AT
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
        <LongArrowAltUpIcon
          onClick={() => onSortSelect(field, false)}
          data-testid={`sort-up-icon ${field}`}
        />
      );
    }
    return (
      <LongArrowAltDownIcon
        onClick={() => onSortSelect(field, true)}
        data-testid={`sort-down-icon ${field}`}
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

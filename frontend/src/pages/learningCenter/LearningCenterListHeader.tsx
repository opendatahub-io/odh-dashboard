import * as React from 'react';
import { useHistory } from 'react-router';
import { ArrowsAltVIcon, LongArrowAltDownIcon, LongArrowAltUpIcon } from '@patternfly/react-icons';
import { setQueryArgument } from '../../utilities/router';
import { useQueryParams } from '../../utilities/useQueryParams';
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
  const history = useHistory();
  const queryParams = useQueryParams();
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;

  const onSortSelect = React.useCallback(
    (sortType: string, ascending: boolean) => {
      setQueryArgument(history, DOC_SORT_KEY, sortType);
      setQueryArgument(history, DOC_SORT_ORDER_KEY, ascending ? SORT_ASC : SORT_DESC);
    },
    [history],
  );

  const renderSortArrow = (field: string) => {
    if (sortType !== field) {
      return (
        <ArrowsAltVIcon
          className="odh-learning-paths__list-view__header__no-sort"
          onClick={() => onSortSelect(field, true)}
        />
      );
    }
    if (sortOrder === SORT_ASC) {
      return <LongArrowAltDownIcon onClick={() => onSortSelect(field, false)} />;
    }
    return <LongArrowAltUpIcon onClick={() => onSortSelect(field, true)} />;
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

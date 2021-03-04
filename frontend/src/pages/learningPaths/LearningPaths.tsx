import React from 'react';
import { Gallery, PageSection } from '@patternfly/react-core';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import ApplicationsPage from '../ApplicationsPage';
import { ODHAppType, ODHDocType } from '../../types';
import QuickStarts from '../../app/QuickStarts';
import OdhDocCard from '../../components/OdhDocCard';
import { useQueryParams } from '../../utilities/useQueryParams';
import {
  SEARCH_FILTER_KEY,
  DOC_TYPE_FILTER_KEY,
  doesDocAppMatch,
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  SORT_TYPE_NAME,
  SORT_ASC,
  SORT_DESC,
} from './learningPathUtils';
import LearningPathsFilter from './LearningPathsFilter';

type DocAppType = {
  odhApp: ODHAppType;
  docType: ODHDocType;
};

const description = `Access all learning paths and getting started resources for Red Hat OpenShift
  Data Science and supported programs.`;

const LearningPaths: React.FC = () => {
  const { components, loaded, loadError } = useWatchComponents(false);
  const [docApps, setDocApps] = React.useState<DocAppType[]>([]);
  const [filteredDocApps, setFilteredDocApps] = React.useState<DocAppType[]>([]);
  const queryParams = useQueryParams();
  const searchQuery = queryParams.get(SEARCH_FILTER_KEY) || '';
  const filters = queryParams.get(DOC_TYPE_FILTER_KEY);
  const typeFilters = React.useMemo(() => {
    return filters?.split(',') || [];
  }, [filters]);
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;
  const isEmpty = !components || components.length === 0;

  React.useEffect(() => {
    if (loaded && !loadError) {
      const updatedDocApps = components.reduce((acc, component) => {
        if (component.spec.quickStart) {
          acc.push({ odhApp: component, docType: ODHDocType.QuickStart });
        }
        if (component.spec.howDoI) {
          acc.push({ odhApp: component, docType: ODHDocType.HowDoI });
        }
        if (component.spec.tutorial) {
          acc.push({ odhApp: component, docType: ODHDocType.Tutorial });
        }
        if (component.spec.docsLink) {
          acc.push({ odhApp: component, docType: ODHDocType.Documentation });
        }
        return acc;
      }, [] as DocAppType[]);
      setDocApps(updatedDocApps);
    }
  }, [components, loaded, loadError]);

  React.useEffect(() => {
    setFilteredDocApps(
      docApps
        .filter((app) => doesDocAppMatch(app, searchQuery, typeFilters))
        .sort((a, b) => {
          let sortVal =
            sortType === SORT_TYPE_NAME
              ? a.odhApp.spec.displayName.localeCompare(b.odhApp.spec.displayName)
              : a.docType.localeCompare(b.docType);
          if (sortOrder === SORT_DESC) {
            sortVal *= -1;
          }
          return sortVal;
        }),
    );
  }, [docApps, searchQuery, typeFilters, sortOrder, sortType]);

  const docTypesCount = React.useMemo(() => {
    return docApps.reduce(
      (acc, docApp) => {
        acc[docApp.docType]++;
        return acc;
      },
      {
        [ODHDocType.Documentation]: 0,
        [ODHDocType.HowDoI]: 0,
        [ODHDocType.Tutorial]: 0,
        [ODHDocType.QuickStart]: 0,
      },
    );
  }, [docApps]);

  return (
    <QuickStarts>
      <ApplicationsPage
        title="Learning paths"
        description={description}
        loaded={loaded}
        empty={isEmpty}
        loadError={loadError}
      >
        <LearningPathsFilter
          count={filteredDocApps.length}
          totalCount={docApps.length}
          docTypeStatusCount={docTypesCount}
        />
        {!isEmpty ? (
          <PageSection>
            <Gallery className="odh-explore-apps__gallery" hasGutter>
              {filteredDocApps.map((app) => (
                <OdhDocCard
                  key={`${app.odhApp.metadata.name}_${app.docType}`}
                  odhApp={app.odhApp}
                  docType={app.docType}
                />
              ))}
            </Gallery>
          </PageSection>
        ) : null}
      </ApplicationsPage>
    </QuickStarts>
  );
};

export default LearningPaths;

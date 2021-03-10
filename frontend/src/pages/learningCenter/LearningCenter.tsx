import React from 'react';
import * as _ from 'lodash';
import { Gallery, PageSection } from '@patternfly/react-core';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { useWatchComponents } from '../../utilities/useWatchComponents';
import ApplicationsPage from '../ApplicationsPage';
import { ODHDoc, ODHDocType } from '../../types';
import QuickStarts from '../../app/QuickStarts';
import OdhDocCard from '../../components/OdhDocCard';
import { useQueryParams } from '../../utilities/useQueryParams';
import {
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  DOC_TYPE_FILTER_KEY,
  doesDocAppMatch,
  SEARCH_FILTER_KEY,
  SORT_ASC,
  SORT_DESC,
  SORT_TYPE_NAME,
} from './learningCenterUtils';
import LearningCenterFilters from './LearningCenterFilters';
import { useWatchDocs } from '../../utilities/useWatchDocs';

const description = `Access all learning paths and getting started resources for Red Hat OpenShift
  Data Science and supported programs.`;

const LearningCenter: React.FC = () => {
  const { docs: odhDocs, loaded: docsLoaded, loadError: docsLoadError } = useWatchDocs();
  const { components, loaded, loadError } = useWatchComponents(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [docApps, setDocApps] = React.useState<ODHDoc[]>([]);
  const [filteredDocApps, setFilteredDocApps] = React.useState<ODHDoc[]>([]);
  const queryParams = useQueryParams();
  const searchQuery = queryParams.get(SEARCH_FILTER_KEY) || '';
  const filters = queryParams.get(DOC_TYPE_FILTER_KEY);
  const typeFilters = React.useMemo(() => {
    return filters?.split(',') || [];
  }, [filters]);
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;

  React.useEffect(() => {
    if (loaded && !loadError && docsLoaded && !docsLoadError) {
      const updatedDocApps = odhDocs.map((odhDoc) => {
        if (!odhDoc.spec.img || !odhDoc.spec.description) {
          const odhApp = components.find((c) => c.metadata.name === odhDoc.spec.appName);
          if (odhApp) {
            const updatedDoc = _.clone(odhDoc);
            updatedDoc.spec.img = odhDoc.spec.img || odhApp.spec.img;
            updatedDoc.spec.description = odhDoc.spec.description || odhApp.spec.description;
            return updatedDoc;
          }
        }
        return odhDoc;
      });

      // Add doc cards for all components' documentation
      components.forEach((component) => {
        if (component.spec.docsLink) {
          const odhDoc: ODHDoc = {
            metadata: {
              name: `${component.metadata.name}-doc`,
              type: ODHDocType.Documentation,
            },
            spec: {
              url: component.spec.docsLink,
              displayName: component.spec.displayName,
              description: component.spec.description,
              img: component.spec.img,
            },
          };
          updatedDocApps.push(odhDoc);
        }
      });

      // Add doc cards for all quick starts
      qsContext.allQuickStarts?.forEach((quickStart) => {
        const odhDoc: ODHDoc = _.merge(quickStart, {
          metadata: { type: ODHDocType.QuickStart },
        });
        updatedDocApps.push(odhDoc);
      });

      setDocApps(updatedDocApps);
    }
  }, [components, loaded, loadError, odhDocs, docsLoaded, docsLoadError, qsContext.allQuickStarts]);

  React.useEffect(() => {
    setFilteredDocApps(
      docApps
        .filter((doc) => doc.metadata.type !== 'getting-started')
        .filter((doc) => doesDocAppMatch(doc, searchQuery, typeFilters))
        .sort((a, b) => {
          let sortVal =
            sortType === SORT_TYPE_NAME
              ? a.spec.displayName.localeCompare(b.spec.displayName)
              : a.metadata.type.localeCompare(b.metadata.type);
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
        if (acc[docApp.metadata.type] !== undefined) {
          acc[docApp.metadata.type]++;
        }
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
    <ApplicationsPage
      title="Learning center"
      description={description}
      loaded={loaded && docsLoaded}
      loadError={loadError || docsLoadError}
      empty={false}
    >
      <LearningCenterFilters
        count={filteredDocApps.length}
        totalCount={docApps.length}
        docTypeStatusCount={docTypesCount}
      />
      <PageSection>
        <Gallery className="odh-explore-apps__gallery" hasGutter>
          {filteredDocApps.map((doc) => (
            <OdhDocCard key={`${doc.metadata.name}`} odhDoc={doc} />
          ))}
        </Gallery>
      </PageSection>
    </ApplicationsPage>
  );
};

const LearningCenterWrapper: React.FC = () => (
  <QuickStarts>
    <LearningCenter />
  </QuickStarts>
);

export default LearningCenterWrapper;

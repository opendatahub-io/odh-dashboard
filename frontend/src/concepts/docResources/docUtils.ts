import * as _ from 'lodash-es';
import { QuickStart } from '@patternfly/quickstarts/src/utils/quick-start-types';
import { OdhApplication, OdhDocument, OdhDocumentType } from '#~/types';
import { combineCategoryAnnotations } from '#~/utilities/utils';

export const updateDocToComponent = (
  odhDoc: OdhDocument,
  components: OdhApplication[],
): OdhDocument => {
  const odhApp = components.find((c) => c.metadata.name === odhDoc.spec.appName);
  const updatedDoc = _.cloneDeep(odhDoc);
  if (odhApp) {
    combineCategoryAnnotations(odhDoc, odhApp);
    updatedDoc.spec.appDisplayName = odhApp.spec.provider;
    updatedDoc.spec.appEnabled = odhApp.spec.isEnabled ?? false;
    updatedDoc.spec.img = odhDoc.spec.img || odhApp.spec.img;
    updatedDoc.spec.description = odhDoc.spec.description || odhApp.spec.description;
    updatedDoc.spec.provider = odhDoc.spec.provider || odhApp.spec.provider;
    updatedDoc.spec.appCategory = odhDoc.spec.appCategory || odhApp.spec.category;
  } else {
    updatedDoc.spec.appEnabled = false;
  }
  return updatedDoc;
};

export const getQuickStartDocs = (
  quickStarts: QuickStart[],
  components: OdhApplication[],
): OdhDocument[] => {
  // Get doc cards for the quick starts
  const docs: OdhDocument[] = quickStarts.map(
    (quickStart) =>
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      _.merge({}, quickStart, {
        spec: {
          type: OdhDocumentType.QuickStart,
        },
      }) as unknown as OdhDocument, // TODO: Fix QuickStart type dependency -- they updated their types and broke us
  );

  return docs.map((odhDoc) => updateDocToComponent(odhDoc, components));
};

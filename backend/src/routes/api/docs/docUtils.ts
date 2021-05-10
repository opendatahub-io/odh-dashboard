import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';
import { ODHDoc } from '../../../types';
import { yamlRegExp } from '../../../utils/constants';
import { getApplicationDefs } from '../../../utils/componentUtils';
import { getComponentFeatureFlags } from '../../../utils/features';

export const getDocs = (): ODHDoc[] => {
  const normalizedPath = path.join(__dirname, '../../../../../data/docs');
  const docs: ODHDoc[] = [];
  const featureFlags = getComponentFeatureFlags();
  const appDefs = getApplicationDefs();

  fs.readdirSync(normalizedPath).forEach((file) => {
    if (yamlRegExp.test(file)) {
      try {
        const doc: ODHDoc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        if (doc.spec.featureFlag) {
          if (featureFlags[doc.spec.featureFlag]) {
            docs.push(doc);
          }
          return;
        }
        if (!doc.spec.appName || appDefs.find((def) => def.metadata.name === doc.spec.appName)) {
          docs.push(doc);
        }
      } catch (e) {
        console.error(`Error loading doc ${file}: ${e}`);
      }
    }
  });
  return docs;
};

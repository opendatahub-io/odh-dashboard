import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';
import { yamlRegExp } from '../../../utils/constants';
import { KubeFastifyInstance, QuickStart } from '../../../types';
import { getComponentFeatureFlags } from '../../../utils/features';

const quickStartsGroup = 'console.openshift.io';
const quickStartsVersion = 'apiextensions.k8s.io/v1';
const quickStartsPlural = 'odhquickstarts';

export const getInstalledQuickStarts = async (
  fastify: KubeFastifyInstance,
): Promise<QuickStart[]> => {
  const installedQuickStarts: QuickStart[] = [];

  const customObjectsApi = fastify.kube.customObjectsApi;
  try {
    const res = await customObjectsApi.listClusterCustomObject(
      quickStartsGroup,
      quickStartsVersion,
      quickStartsPlural,
    );
    installedQuickStarts.push(...((res.body as { items: QuickStart[] })?.items ?? []));
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const featureFlags = getComponentFeatureFlags();
  const normalizedPath = path.join(__dirname, '../../../../../data/quickstarts');
  fs.readdirSync(normalizedPath).forEach((file) => {
    if (yamlRegExp.test(file)) {
      try {
        const doc: QuickStart = jsYaml.load(
          fs.readFileSync(path.join(normalizedPath, file), 'utf8'),
        );
        if (!doc.spec.featureFlag || featureFlags[doc.spec.featureFlag]) {
          installedQuickStarts.push(doc);
        }
      } catch (e) {
        console.error(`Error loading quick start ${file}: ${e}`);
      }
    }
  });

  return installedQuickStarts;
};

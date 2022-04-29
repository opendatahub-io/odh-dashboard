import * as fs from 'fs';
import * as path from 'path';
import { getDashboardConfig } from './resourceUtils';

export const getComponentFeatureFlags = (): { [key: string]: string } => {
  const normalizedPath = path.join(__dirname, '../../../data/features.json');
  try {
    const features = JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
    const dashboardConfig = getDashboardConfig();
    if (dashboardConfig.notebookController) {
      features['notebook-controller'] = true;
    }
    return features;
  } catch {
    return {};
  }
};

import * as fs from 'fs';
import * as path from 'path';

export const getComponentFeatureFlags = (): { [key: string]: string } => {
  const normalizedPath = path.join(__dirname, '../../../data/features.json');
  try {
    return JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
  } catch {
    return {};
  }
};

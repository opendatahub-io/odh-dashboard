import createError from 'http-errors';
import * as fs from 'fs';
import * as path from 'path';
import { OdhGettingStarted } from '../../../types';
import { mdRegExp } from '../../../utils/constants';

export const getGettingStartedDoc = (appName: string): OdhGettingStarted[] => {
  const normalizedPath = path.join(__dirname, '../../../../../data/getting-started');
  try {
    const markdown = fs.readFileSync(path.join(normalizedPath, `${appName}.md`), 'utf8');
    return [{ appName, markdown }];
  } catch (e) {
    const error = createError(500, 'failed to getting started file');
    error.explicitInternalServerError = true;
    error.error = 'failed to getting started file';
    error.message = `Unable to load getting started documentation for ${appName}.`;
    throw error;
    // throw new Error(`Unable to load getting started documentation for ${appName}.`);
  }
};

export const getGettingStartedDocs = (): OdhGettingStarted[] => {
  const normalizedPath = path.join(__dirname, '../../../../../data/getting-started');
  const gettingStartedDocs: OdhGettingStarted[] = [];
  fs.readdirSync(normalizedPath).forEach((file) => {
    if (mdRegExp.test(file)) {
      try {
        const markdown = fs.readFileSync(path.join(normalizedPath, file), 'utf8');
        gettingStartedDocs.push({
          appName: file.replace('.md', ''),
          markdown,
        });
      } catch (e) {
        console.error(`Error loading getting started markdown ${file}: ${e}`);
      }
    }
  });
  return gettingStartedDocs;
};

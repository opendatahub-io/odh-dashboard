const { execSync } = require('child_process');

describe('Build distribution', () => {
  const outputDirs = ['./backend/dist', './frontend/public'];

  it('should match a specific file output', () => {
    const fileOutput = [];

    outputDirs.forEach(outputDir => {
      const output = execSync(`find ${outputDir} -type f -print0 | xargs -0`);

      fileOutput.push(output
        .toString()
        .replace(/\s+|\n+|\r+/g, '')
        .replace(new RegExp(`${outputDir}`, 'gi'), `~${outputDir}`)
        .replace(new RegExp(`~${outputDir}/.DS_Store`, 'gi'), '')
        .replace(/\.([a-z0-9]+)\./gi, '*')
        .split('~')
        .sort().filter(file => !(/(fonts|images)/i.test(file))))
    });

    expect(fileOutput).toMatchSnapshot('consistent output');
  });
});

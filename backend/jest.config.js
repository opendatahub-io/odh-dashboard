module.exports = {
  testEnvironment: 'node',

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',

  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    "^.+\\.(js|jsx)$": "babel-jest",
  },
};
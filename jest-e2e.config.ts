export default {
  moduleFileExtensions: ['js', 'json', 'ts', 'node'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
};



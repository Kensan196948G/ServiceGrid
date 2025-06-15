module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/../src'],
  setupFilesAfterEnv: ['<rootDir>/../src/setupTests.ts'],
  testMatch: [
    '<rootDir>/../src/**/__tests__/**/*.{js,ts,tsx}',
    '<rootDir>/../src/**/*.(test|spec).{js,ts,tsx}'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub'
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  collectCoverageFrom: [
    '../src/**/*.{ts,tsx}',
    '!../src/**/*.d.ts',
    '!../src/index.tsx',
    '!../src/vite-env.d.ts'
  ],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true
};
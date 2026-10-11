import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Node server — used in Vitest (Node/jsdom environment).
 * Started in src/test/setup.js before all test suites.
 */
export const server = setupServer(...handlers);

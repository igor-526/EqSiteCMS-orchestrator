import { createRequire } from 'node:module';
// Resolve from the existing FE lockfile environment, never root/dsh node_modules.
const require = createRequire(new URL('../../../services/frontend/package.json', import.meta.url));
export const loadPlaywright = () => require('playwright');
export const axePath = () => require.resolve('axe-core/axe.min.js');

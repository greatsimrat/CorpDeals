import fs from 'fs';
import path from 'path';
import {
  auditRoutes,
  buildCurlSmokeTestScript,
  collectRoutes,
  extractFrontendEndpoints,
} from '../lib/route-inspector';

process.env.PORT = process.env.PORT || '0';
process.env.PRINT_ROUTES = 'false';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../index').default;

const backendRoot = process.cwd();
const frontendApiFile = path.resolve(backendRoot, '../app/src/services/api.ts');
const curlScriptPath = path.resolve(backendRoot, 'scripts/test-routes.ps1');

if (!fs.existsSync(frontendApiFile)) {
  throw new Error(`Frontend API client not found: ${frontendApiFile}`);
}

const routes = collectRoutes(app);
const frontendEndpoints = extractFrontendEndpoints(frontendApiFile);
const report = auditRoutes(routes, frontendEndpoints);

buildCurlSmokeTestScript(routes, curlScriptPath);

console.log('\nRoutes Summary');
console.table(report.routes);

console.log('\nFrontend Endpoints');
console.table(
  report.frontendEndpoints.map((endpoint) => ({
    method: endpoint.method,
    path: endpoint.path,
    source: endpoint.source,
  }))
);

console.log('\nMissing Frontend Routes');
console.table(
  report.missingFrontendRoutes.map((endpoint) => ({
    method: endpoint.method,
    path: endpoint.path,
    source: endpoint.source,
  }))
);

console.log('\nDuplicate Routes');
console.table(report.duplicates);

console.log('\nRoutes Missing /api Prefix');
console.table(report.nonApiRoutes);

console.log('\nInvalid Route Patterns');
console.table(report.invalidRoutes);

console.log('\nBackend Routes Not Referenced By Frontend');
console.table(report.unusedBackendRoutes);

console.log(`\nCurl smoke test written to ${curlScriptPath}`);

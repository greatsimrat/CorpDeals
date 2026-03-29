import type express from 'express';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const MOUNT_PATH_KEY = Symbol.for('corpdeals.mountPath');

type StackContainer = {
  stack?: RouteLayer[];
  router?: { stack?: RouteLayer[] };
  _router?: { stack?: RouteLayer[] };
};

type RouteLayer = {
  handle?: RouteHandler;
  route?: {
    path?: string | string[];
    methods?: Record<string, boolean>;
  };
  [MOUNT_PATH_KEY]?: string;
};

type RouteHandler = {
  stack?: RouteLayer[];
  [MOUNT_PATH_KEY]?: string;
};

export type RouteRecord = {
  method: string;
  path: string;
};

export type FrontendEndpoint = {
  method: string;
  path: string;
  source: string;
};

export type RouteAuditReport = {
  routes: RouteRecord[];
  duplicates: RouteRecord[];
  nonApiRoutes: RouteRecord[];
  invalidRoutes: Array<RouteRecord & { issue: string }>;
  frontendEndpoints: FrontendEndpoint[];
  missingFrontendRoutes: FrontendEndpoint[];
  unusedBackendRoutes: RouteRecord[];
};

export function mountRouter(
  app: Pick<express.Application, 'use'>,
  mountPath: string,
  router: express.Router
) {
  app.use(mountPath, router);
  const stack = getStack(app as unknown as StackContainer);
  const lastLayer = stack[stack.length - 1];
  if (lastLayer) {
    lastLayer[MOUNT_PATH_KEY] = mountPath;
  }
  return router;
}

export function collectRoutes(container: unknown): RouteRecord[] {
  const routes: RouteRecord[] = [];
  const rootStack = getStack(container as StackContainer);
  walkStack(rootStack, '', routes);

  return routes
    .map((route) => ({
      method: route.method.toUpperCase(),
      path: normalizeResolvedPath(route.path),
    }))
    .sort((left, right) => {
      if (left.path === right.path) {
        return left.method.localeCompare(right.method);
      }
      return left.path.localeCompare(right.path);
    });
}

export function printRoutesTable(container: unknown) {
  const routes = collectRoutes(container);
  console.table(routes);
  return routes;
}

export function auditRoutes(
  routes: RouteRecord[],
  frontendEndpoints: FrontendEndpoint[]
): RouteAuditReport {
  const routeKeyCounts = new Map<string, number>();
  for (const route of routes) {
    const key = toRouteKey(route.method, route.path);
    routeKeyCounts.set(key, (routeKeyCounts.get(key) || 0) + 1);
  }

  const normalizedBackendRouteKeys = new Set(
    routes.map((route) => toRouteKey(route.method, normalizeComparablePath(route.path)))
  );

  const duplicates = routes.filter(
    (route) => (routeKeyCounts.get(toRouteKey(route.method, route.path)) || 0) > 1
  );

  const nonApiRoutes = routes.filter((route) => !route.path.startsWith('/api'));
  const invalidRoutes = routes.flatMap((route) => validateRoute(route));

  const missingFrontendRoutes = frontendEndpoints.filter((endpoint) => {
    return !normalizedBackendRouteKeys.has(
      toRouteKey(endpoint.method, normalizeComparablePath(endpoint.path))
    );
  });

  const normalizedFrontendRouteKeys = new Set(
    frontendEndpoints.map((endpoint) =>
      toRouteKey(endpoint.method, normalizeComparablePath(endpoint.path))
    )
  );

  const unusedBackendRoutes = routes.filter((route) => {
    return !normalizedFrontendRouteKeys.has(
      toRouteKey(route.method, normalizeComparablePath(route.path))
    );
  });

  return {
    routes,
    duplicates,
    nonApiRoutes,
    invalidRoutes,
    frontendEndpoints,
    missingFrontendRoutes,
    unusedBackendRoutes,
  };
}

export function extractFrontendEndpoints(frontendApiFile: string): FrontendEndpoint[] {
  const content = fs.readFileSync(frontendApiFile, 'utf8');
  const sourceFile = ts.createSourceFile(
    frontendApiFile,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const endpoints: FrontendEndpoint[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const maybeEndpoint = extractEndpointFromCall(node, sourceFile);
      if (maybeEndpoint) {
        endpoints.push(maybeEndpoint);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return dedupeEndpoints(endpoints).sort((left, right) => {
    if (left.path === right.path) {
      return left.method.localeCompare(right.method);
    }
    return left.path.localeCompare(right.path);
  });
}

export function buildCurlSmokeTestScript(
  routes: RouteRecord[],
  outputPath: string,
  baseUrl = 'http://localhost:3001'
) {
  const script = [
    "$BaseUrl = if ($args.Length -gt 0 -and $args[0]) { $args[0].TrimEnd('/') } else { '" + baseUrl + "' }",
    '$Routes = @(',
    ...routes.map((route) => {
      const routePath = replaceRouteParamsWithSamples(route.path);
      return `  [pscustomobject]@{ Method = '${route.method}'; Path = '${routePath}' }`;
    }),
    ')',
    '',
    'foreach ($route in $Routes) {',
    '  $url = "$BaseUrl$($route.Path)"',
    "  $bodyArgs = @()",
    "  if ($route.Method -in @('POST', 'PUT', 'PATCH')) {",
    "    $bodyArgs = @('-H', 'Content-Type: application/json', '-d', '{}')",
    '  }',
    "  $status = curl.exe -s -o NUL -w '%{http_code}' -X $route.Method @bodyArgs $url",
    "  Write-Output (\"{0}`t{1}`t{2}\" -f $route.Method, $status, $route.Path)",
    '}',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, script, 'utf8');
}

function getStack(container: StackContainer): RouteLayer[] {
  return container.stack || container.router?.stack || container._router?.stack || [];
}

function walkStack(stack: RouteLayer[], basePath: string, routes: RouteRecord[]) {
  for (const layer of stack) {
    if (layer.route?.path) {
      const routePaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      const methods = Object.entries(layer.route.methods || {})
        .filter(([, enabled]) => enabled)
        .map(([method]) => method.toUpperCase());

      for (const method of methods) {
        for (const routePath of routePaths) {
          routes.push({
            method,
            path: joinPaths(basePath, routePath),
          });
        }
      }
      continue;
    }

    if (layer.handle?.stack) {
      const mountPath = layer[MOUNT_PATH_KEY] || layer.handle[MOUNT_PATH_KEY] || '';
      walkStack(layer.handle.stack, joinPaths(basePath, mountPath), routes);
    }
  }
}

function joinPaths(basePath: string, nextPath: string) {
  if (!nextPath) return normalizeResolvedPath(basePath || '/');
  if (!basePath) return normalizeResolvedPath(nextPath);
  return normalizeResolvedPath(`${basePath}/${nextPath}`);
}

function normalizeResolvedPath(pathValue: string) {
  const normalized = pathValue.replace(/\/+/g, '/');
  if (normalized === '/') return normalized;
  return normalized.replace(/\/$/, '') || '/';
}

function normalizeComparablePath(pathValue: string) {
  return normalizeResolvedPath(pathValue).replace(/:[A-Za-z0-9_]+/g, ':param');
}

function normalizeFrontendPath(pathValue: string) {
  return normalizeResolvedPath(
    pathValue.replace(/\?.*$/, '')
  );
}

function toRouteKey(method: string, pathValue: string) {
  return `${method.toUpperCase()} ${pathValue}`;
}

function dedupeEndpoints(endpoints: FrontendEndpoint[]) {
  const seen = new Set<string>();
  return endpoints.filter((endpoint) => {
    const key = `${endpoint.method} ${endpoint.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateRoute(route: RouteRecord) {
  const issues: Array<RouteRecord & { issue: string }> = [];
  if (!route.path.startsWith('/')) {
    issues.push({ ...route, issue: 'path does not start with "/"' });
  }
  if (route.path.includes('//')) {
    issues.push({ ...route, issue: 'path contains duplicate slashes' });
  }
  if (/\s/.test(route.path)) {
    issues.push({ ...route, issue: 'path contains whitespace' });
  }
  if (route.path !== '/' && route.path.endsWith('/')) {
    issues.push({ ...route, issue: 'path has a trailing slash' });
  }
  return issues;
}

function replaceRouteParamsWithSamples(pathValue: string) {
  return pathValue.replace(/:([A-Za-z0-9_]+)/g, (_match, paramName: string) => {
    const lowered = paramName.toLowerCase();
    if (lowered.includes('company')) return 'amazon';
    if (lowered.includes('offer')) return 'dev-amazon-lead-offer';
    if (lowered.includes('invoice')) return 'sample-invoice';
    if (lowered.includes('lead')) return 'sample-lead';
    if (lowered.includes('vendor')) return 'sample-vendor';
    if (lowered === 'id') return 'sample-id';
    return `sample-${paramName}`;
  });
}

function extractEndpointFromCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile
): FrontendEndpoint | null {
  const callee = node.expression;
  const methodName = ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
  const isRequestCall =
    methodName === 'request' && ts.isPropertyAccessExpression(callee) && callee.expression.kind === ts.SyntaxKind.ThisKeyword;
  const isFetchCall = ts.isIdentifier(callee) && callee.text === 'fetch';

  if (!isRequestCall && !isFetchCall) {
    return null;
  }

  const firstArg = node.arguments[0];
  if (!firstArg) {
    return null;
  }

  const rawPath = isFetchCall
    ? resolveFetchPath(firstArg, sourceFile)
    : resolveRequestPath(firstArg, sourceFile);

  if (!rawPath || !rawPath.startsWith('/')) {
    return null;
  }

  const method = resolveRequestMethod(node.arguments[1], sourceFile);
  const normalizedPath = normalizeFrontendPath(rawPath);
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  return {
    method,
    path: normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`,
    source: `app/src/services/api.ts:${line}`,
  };
}

function resolveRequestMethod(secondArg: ts.Expression | undefined, sourceFile: ts.SourceFile) {
  if (!secondArg || !ts.isObjectLiteralExpression(secondArg)) {
    return 'GET';
  }

  for (const property of secondArg.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      getPropertyName(property.name) === 'method' &&
      ts.isStringLiteralLike(property.initializer)
    ) {
      return property.initializer.text.toUpperCase();
    }
  }

  return 'GET';
}

function resolveRequestPath(arg: ts.Expression, sourceFile: ts.SourceFile) {
  return resolvePathExpression(arg, sourceFile, false);
}

function resolveFetchPath(arg: ts.Expression, sourceFile: ts.SourceFile) {
  const resolved = resolvePathExpression(arg, sourceFile, true);
  if (!resolved) return null;
  return resolved.replace(/^\$\{API_BASE_URL\}/, '');
}

function resolvePathExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  allowApiBasePrefix: boolean
): string | null {
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }

  if (ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }

  if (ts.isTemplateExpression(expression)) {
    let current = expression.head.text;

    for (const span of expression.templateSpans) {
      const expressionText = span.expression.getText(sourceFile);
      const literalText = span.literal.text;

      if (current.includes('?')) {
        continue;
      }

      const looksLikeQuerySuffix =
        current.endsWith('?') ||
        expressionText.includes('query') ||
        expressionText.includes('params.toString') ||
        expressionText.includes('searchParams') ||
        expressionText.includes('buildQuery') ||
        expressionText.includes('?');

      if (looksLikeQuerySuffix && !current.endsWith('/')) {
        continue;
      }

      if (current.endsWith('/') || literalText.startsWith('/')) {
        current += `:param${literalText}`;
        continue;
      }

      current += literalText;
    }

    return current;
  }

  if (allowApiBasePrefix && ts.isBinaryExpression(expression)) {
    const left = resolvePathExpression(expression.left, sourceFile, true);
    const right = resolvePathExpression(expression.right, sourceFile, true);
    return `${left || ''}${right || ''}`;
  }

  return null;
}

function getPropertyName(name: ts.PropertyName) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText();
}

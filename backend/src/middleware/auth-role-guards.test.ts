import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin, requireAdminOrFinance, requireAdminOrSales } from './auth';

type MockRes = {
  statusCode: number;
  body: any;
  status: (code: number) => MockRes;
  json: (value: any) => MockRes;
};

const createMockRes = (): MockRes => {
  const state: MockRes = {
    statusCode: 200,
    body: null,
    status(code: number) {
      state.statusCode = code;
      return state;
    },
    json(value: any) {
      state.body = value;
      return state;
    },
  };
  return state;
};

test('requireAdmin blocks FINANCE role from admin-only mutation routes', () => {
  let nextCalled = false;
  const req: any = {
    user: {
      id: 'user-1',
      role: 'FINANCE',
      roles: ['FINANCE'],
    },
  };
  const res = createMockRes();
  requireAdmin(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('requireAdmin allows ADMIN role', () => {
  let nextCalled = false;
  const req: any = {
    user: {
      id: 'user-1',
      role: 'ADMIN',
      roles: ['ADMIN'],
    },
  };
  const res = createMockRes();
  requireAdmin(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

for (const role of ['SALES', 'VENDOR', 'USER']) {
  test(`requireAdmin blocks ${role} role`, () => {
    let nextCalled = false;
    const req: any = {
      user: {
        id: 'user-1',
        role,
        roles: [role],
      },
    };
    const res = createMockRes();
    requireAdmin(req, res as any, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
}

test('requireAdminOrFinance allows FINANCE and ADMIN', () => {
  for (const role of ['FINANCE', 'ADMIN']) {
    let nextCalled = false;
    const req: any = { user: { id: 'user-1', role, roles: [role] } };
    const res = createMockRes();
    requireAdminOrFinance(req, res as any, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  }
});

test('requireAdminOrFinance blocks SALES and VENDOR', () => {
  for (const role of ['SALES', 'VENDOR']) {
    let nextCalled = false;
    const req: any = { user: { id: 'user-1', role, roles: [role] } };
    const res = createMockRes();
    requireAdminOrFinance(req, res as any, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  }
});

test('requireAdminOrSales allows SALES and ADMIN but blocks FINANCE', () => {
  for (const role of ['SALES', 'ADMIN']) {
    let nextCalled = false;
    const req: any = { user: { id: 'user-1', role, roles: [role] } };
    const res = createMockRes();
    requireAdminOrSales(req, res as any, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  }

  let nextCalled = false;
  const req: any = { user: { id: 'user-1', role: 'FINANCE', roles: ['FINANCE'] } };
  const res = createMockRes();
  requireAdminOrSales(req, res as any, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

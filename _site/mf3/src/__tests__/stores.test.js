// ── Stores Tests ──────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  GEAR_CATALOG, UNIFORM_CATALOG, STORE_CATALOGS, STORE_ROLES,
} from '../stores.js';

describe('GEAR_CATALOG', () => {
  it('has all required fields for each entry', () => {
    for (const item of GEAR_CATALOG) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('short');
      expect(item).toHaveProperty('cat');
      expect(item).toHaveProperty('cost');
      expect(item).toHaveProperty('level');
      expect(item).toHaveProperty('desc');
      expect(typeof item.id).toBe('string');
      expect(typeof item.cost).toBe('number');
      expect(typeof item.level).toBe('number');
    }
  });

  it('has no duplicate IDs', () => {
    const ids = GEAR_CATALOG.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has only valid categories', () => {
    const validCats = ['sidearm', 'comms', 'less_lethal', 'restraint', 'misc', 'rifle', 'shotgun', 'defense'];
    for (const item of GEAR_CATALOG) {
      expect(validCats).toContain(item.cat);
    }
  });
});

describe('UNIFORM_CATALOG', () => {
  it('has required fields', () => {
    for (const item of UNIFORM_CATALOG) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('short');
      expect(item).toHaveProperty('cost');
      expect(item).toHaveProperty('level');
      expect(item).toHaveProperty('desc');
    }
  });

  it('has no duplicate IDs', () => {
    const ids = UNIFORM_CATALOG.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('STORE_CATALOGS', () => {
  const expectedStores = ['convenience', 'bookstore', 'club', 'bank', 'jewelry', 'gas_mart', 'pharmacy', 'cafe', 'pawn', 'electronics', 'laundry', 'house', 'generic'];

  it('has all expected store types', () => {
    for (const store of expectedStores) {
      expect(STORE_CATALOGS).toHaveProperty(store);
      expect(Array.isArray(STORE_CATALOGS[store])).toBe(true);
    }
  });

  it('has no duplicate item IDs within a store', () => {
    for (const [storeName, items] of Object.entries(STORE_CATALOGS)) {
      const ids = items.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length, `Duplicate ID in store: ${storeName}`);
    }
  });

  it('has valid items with required fields', () => {
    for (const [storeName, items] of Object.entries(STORE_CATALOGS)) {
      for (const item of items) {
        expect(item, `Missing id in ${storeName}: ${item.id || 'unknown'}`).toHaveProperty('id');
        expect(item, `Missing label in ${storeName}`).toHaveProperty('label');
        expect(item, `Missing price in ${storeName}: ${item.id}`).toHaveProperty('price');
        expect(item, `Missing desc in ${storeName}: ${item.id}`).toHaveProperty('desc');
        expect(typeof item.price, `Price not a number in ${storeName}: ${item.id}`).toBe('number');
      }
    }
  });
});

describe('STORE_ROLES', () => {
  it('has all required fields', () => {
    for (const role of STORE_ROLES) {
      expect(role).toHaveProperty('role');
      expect(role).toHaveProperty('label');
      expect(role).toHaveProperty('interiorId');
      expect(role).toHaveProperty('facadeTag');
      expect(role).toHaveProperty('lot');
      expect(typeof role.lot).toBe('boolean');
    }
  });

  it('has no duplicate roles', () => {
    const roles = STORE_ROLES.map(r => r.role);
    expect(new Set(roles).size).toBe(roles.length);
  });

  it('has no duplicate interiorIds', () => {
    const ids = STORE_ROLES.map(r => r.interiorId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

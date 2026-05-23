// ── Save System Tests ─────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveGame, loadGame, deleteSave } from '../save.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('saveGame', () => {
  const sampleState = {
    money: 42.50,
    playerX: 1040,
    playerY: 2080,
    gear: ['glock', 'radio', 'taser'],
    handItem: 'glock',
    uniformId: 'class_a',
    stamina: 85,
    health: 100,
    trust: { 'Millbank Row': 70 },
    assignmentsCompleted: 3,
  };

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    // Mock notebook textarea
    document.body.innerHTML = '<textarea id="notebook-text">Sample notes</textarea>';
  });

  it('saves game state to localStorage', () => {
    const result = saveGame(sampleState);
    expect(result).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedKey = localStorageMock.setItem.mock.calls[0][0];
    expect(savedKey).toBe('beatcop_save');
  });

  it('saves game state with version and timestamp', () => {
    saveGame(sampleState);
    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(savedData.version).toBe(1);
    expect(savedData.timestamp).toBeGreaterThan(0);
    expect(savedData.money).toBe(42.50);
    expect(savedData.notes).toBe('Sample notes');
  });

  it('saves empty notebook string when textarea is absent', () => {
    document.body.innerHTML = '';
    saveGame(sampleState);
    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(savedData.notes).toBe('');
  });
});

describe('loadGame', () => {
  const savedData = {
    version: 1,
    timestamp: Date.now(),
    money: 99.99,
    playerX: 500,
    playerY: 600,
    gear: ['glock'],
    handItem: 'baton',
    uniformId: 'class_a',
    stamina: 90,
    health: 80,
    trust: {},
    assignmentsCompleted: 5,
    notes: 'Test notes',
  };

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('returns null when no save exists', () => {
    const result = loadGame();
    expect(result).toBeNull();
  });

  it('loads game state from localStorage', () => {
    localStorage.setItem('beatcop_save', JSON.stringify(savedData));
    const result = loadGame();
    expect(result).not.toBeNull();
    expect(result.money).toBe(99.99);
    expect(result.playerX).toBe(500);
    expect(result.playerY).toBe(600);
    expect(result.gear).toEqual(['glock']);
    expect(result.handItem).toBe('baton');
  });

  it('returns null for wrong version', () => {
    const oldVersion = { ...savedData, version: 0 };
    localStorage.setItem('beatcop_save', JSON.stringify(oldVersion));
    const result = loadGame();
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem('beatcop_save', 'not valid json');
    const result = loadGame();
    expect(result).toBeNull();
  });
});

describe('deleteSave', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('removes the save key from localStorage', () => {
    localStorage.setItem('beatcop_save', 'test');
    deleteSave();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('beatcop_save');
  });
});

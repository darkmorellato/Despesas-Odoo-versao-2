import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase
vi.mock('@/config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => vi.fn()),
    signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
  },
  db: {},
  getFirebaseRefs: vi.fn(() => ({
    expensesRef: {
      add: vi.fn(),
      doc: vi.fn(() => ({
        update: vi.fn(),
        delete: vi.fn(),
      })),
      orderBy: vi.fn(() => ({
        onSnapshot: vi.fn(() => vi.fn()),
      })),
    },
    checksRef: {},
  })),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  serverTimestamp: vi.fn(() => new Date())
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  onSnapshot: vi.fn(() => vi.fn()),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => false,
    data: () => ({})
  })),
  doc: vi.fn(() => ({ id: 'mock-doc-id' })),
  query: vi.fn(),
  orderBy: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({
    docs: []
  })),
  serverTimestamp: vi.fn(() => new Date())
}));

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(),
  createGain: vi.fn(),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  const mock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
  return mock;
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

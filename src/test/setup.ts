import '@testing-library/jest-dom'

// Polyfill ResizeObserver for jsdom (required by Radix UI components)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(_callback: ResizeObserverCallback) { /* noop */ }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

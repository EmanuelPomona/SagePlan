import "@testing-library/jest-dom/vitest";

/**
 * Node 26 ships an experimental global `localStorage` that is unavailable unless
 * the process is started with `--localstorage-file`. Its getter occupies the
 * property on globalThis, so jsdom's own Storage is never reachable and every
 * read returns undefined:
 *
 *   ExperimentalWarning: localStorage is not available because
 *   --localstorage-file was not provided.
 *
 * CI pins Node 22 (docs/ARCHITECTURE.md), where jsdom installs Storage normally
 * and this shim does nothing. It only fills the gap when the property is missing,
 * so it can never mask a real jsdom regression.
 *
 * The class is exported onto globalThis as `Storage` because that is what tests
 * spy on to simulate a full disk.
 */
class MemoryStorage {
  #entries = new Map<string, string>();

  get length(): number {
    return this.#entries.size;
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#entries.get(String(key)) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#entries.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.#entries.delete(String(key));
  }

  clear(): void {
    this.#entries.clear();
  }
}

if (typeof globalThis.localStorage === "undefined") {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "Storage", { value: MemoryStorage, configurable: true, writable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: new MemoryStorage(), configurable: true, writable: true });
}

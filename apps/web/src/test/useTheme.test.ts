import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { THEME_STORAGE_KEY, useTheme } from "../theme/useTheme.ts";

function stubMatchMedia(prefersDark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: prefersDark && query.includes("dark"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  stubMatchMedia(false);
});
afterEach(() => vi.unstubAllGlobals());

describe("the default canvas is light (v1 brief revision)", () => {
  test("with nothing stored the preference is light, not system", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe("light");
  });

  test("and it is written onto the document, so native controls follow it too", () => {
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("light stays light even when the OS asks for dark", () => {
    stubMatchMedia(true);
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("an explicit choice is still honoured", () => {
  test("a stored dark preference wins", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("an explicit system preference defers to the media query by removing the attribute", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  test("choosing a theme persists it", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setPreference("dark"));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("a corrupt stored value falls back to light rather than throwing", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "chartreuse");
    expect(renderHook(() => useTheme()).result.current.preference).toBe("light");
  });
});

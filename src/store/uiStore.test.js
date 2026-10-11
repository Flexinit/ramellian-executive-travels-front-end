import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

const getStore = () => useUiStore.getState();

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.getState().closeMobileMenu();
  });

  it('starts with mobileMenuOpen = false', () => {
    expect(getStore().mobileMenuOpen).toBe(false);
  });

  it('toggleMobileMenu opens the menu when closed', () => {
    getStore().toggleMobileMenu();
    expect(getStore().mobileMenuOpen).toBe(true);
  });

  it('toggleMobileMenu closes the menu when open', () => {
    getStore().toggleMobileMenu();
    getStore().toggleMobileMenu();
    expect(getStore().mobileMenuOpen).toBe(false);
  });

  it('closeMobileMenu sets mobileMenuOpen to false', () => {
    getStore().toggleMobileMenu();
    getStore().closeMobileMenu();
    expect(getStore().mobileMenuOpen).toBe(false);
  });

  it('closeMobileMenu is idempotent when already closed', () => {
    getStore().closeMobileMenu();
    getStore().closeMobileMenu();
    expect(getStore().mobileMenuOpen).toBe(false);
  });
});

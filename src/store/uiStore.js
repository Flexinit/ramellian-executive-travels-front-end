import { create } from 'zustand';

/**
 * UI state store — controls global UI elements like the mobile menu.
 */
const useUiStore = create((set) => ({
  /** @type {boolean} */
  mobileMenuOpen: false,

  /** Toggle the mobile navigation drawer open/closed. */
  toggleMobileMenu: () =>
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  /** Explicitly close the mobile navigation drawer. */
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}));

export { useUiStore };

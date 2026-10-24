import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * Accessible dropdown panel used by NavLink (nav dropdowns) and UserMenu
 * (account menu). Items are either navigational (`to`) or actions (`onClick`).
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {Array<{label: string, to?: string, onClick?: function, icon?: React.ComponentType}>} items
 * @param {string} className — extra positioning classes (e.g. `right-0 left-auto`)
 * @param {React.ReactNode} header — optional content rendered above the items, separated by a divider
 */
export default function DropdownMenu({ isOpen, onClose, items = [], className = '', header = null }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleOutsideClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="menu"
      className={`absolute left-0 top-full mt-3 min-w-[240px] rounded-2xl border border-black/10 bg-surface shadow-card py-2.5 z-40 origin-top animate-panel-in ${className}`}
    >
      {header && <div className="px-4 pb-2.5 mb-1.5 border-b border-black/10">{header}</div>}
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            {Icon && <Icon size={16} className="shrink-0" aria-hidden="true" />}
            <span>{item.label}</span>
          </>
        );
        const itemClassName =
          'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink hover:bg-black/5 hover:text-accent transition-colors focus-ring text-left rounded-lg mx-1.5 w-[calc(100%-0.75rem)]';

        if (item.to) {
          return (
            <Link key={item.to} to={item.to} role="menuitem" onClick={onClose} className={itemClassName}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={itemClassName}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

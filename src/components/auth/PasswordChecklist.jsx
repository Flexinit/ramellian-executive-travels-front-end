import React from 'react';
import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../../lib/password';

/**
 * Under a new-password field: each rule (`PASSWORD_RULES`), ticked off as it's met while the person types.
 * @param {string} password
 */
export default function PasswordChecklist({ password = '' }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Password rules">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.key} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-400' : 'text-brand-grey'}`}>
            {ok ? <Check size={12} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? '(done)' : '(still needed)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

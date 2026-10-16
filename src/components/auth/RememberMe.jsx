import React, { useEffect, useState } from 'react';
import Checkbox from '../ui/Checkbox';
import { setRememberMe } from '../../store/authStore';

/**
 * "Remember me" on the log-in and sign-up forms: ticked, the sign-in is kept after the browser is closed (until it
 * expires or they log out); unticked, it ends with the browser session. Applies to whichever way they then sign in
 * — password, Google, or the automatic sign-in after verifying a new account. See `setRememberMe` (authStore).
 */
export default function RememberMe({ className = '' }) {
  const [checked, setChecked] = useState(false);
  useEffect(() => setRememberMe(false), []); // each form starts unticked
  return (
    <Checkbox
      className={className}
      checked={checked}
      onChange={(e) => {
        setChecked(e.target.checked);
        setRememberMe(e.target.checked);
      }}
      label="Remember me on this device"
    />
  );
}

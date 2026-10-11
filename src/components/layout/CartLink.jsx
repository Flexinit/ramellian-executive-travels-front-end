import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { LINK, CountBadge } from './NotificationBell';
import { useCartCount } from '../../store/cartStore';

/**
 * The booking basket in the top bar: shown to everyone (signed in or not) once at least one vehicle has been
 * added, with how many, and opens the selection. Renders nothing while the selection is empty.
 */
export default function CartLink() {
  const count = useCartCount();
  if (count === 0) return null;

  return (
    <Link to="/booking" aria-label={`Your booking, ${count} ${count === 1 ? 'vehicle' : 'vehicles'}`} className={LINK}>
      <ShoppingBag size={20} aria-hidden="true" />
      <CountBadge count={count} />
    </Link>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

/**
 * The one button for the whole portal — the look of the navbar's "Rent a Car"
 * button: a gold-outline pill, semibold `text-sm`. Use it for every button
 * and every link that looks like one, rather than styling a `<button>` or
 * `<Link>` by hand.
 *
 * Pass `to` to render a router link (same look, real `<a>`), or `href` for an
 * external link; otherwise it's a `<button>`.
 *
 * @param {'default'|'danger'|'dark'|'navy'} variant
 *   default — the "Rent a Car" look: a gold outline pill, used for EVERY button
 *   (there is no text-only version); danger — the same pill in red, for
 *   destructive actions; dark — the same pill in dark ink, only for a gold or white surface;
 *   navy — the same pill filled in the brand's navy with gold text, the one filled button, for the main
 *   "go on" step on a white surface (the contract's Next, as asked by the product owner 2026-10-16).
 * @param {'sm'|'md'|'lg'|'icon'} size — md is the navbar button size; icon is a round icon-only button
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {'button'|'submit'|'reset'} type — buttons only
 * @param {string} [to] — render as a router `<Link>` to this path
 * @param {string} [href] — render as a plain `<a>` to this address
 * @param {string} className — layout only (width, margin); not for restyling
 * @param {React.ReactNode} children
 * @param {function} onClick
 */
export default function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  onClick,
  to,
  href,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark cursor-pointer select-none active:scale-95';

  const off = 'disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none';

  const variants = {
    default: `border border-brand-gold text-brand-gold bg-transparent hover:bg-brand-gold/10 ${off}`,
    danger: `border border-red-500 text-red-400 bg-transparent hover:bg-red-500/10 ${off}`,
    dark: `border border-brand-dark text-brand-dark bg-transparent hover:bg-brand-dark/10 ${off}`,
    navy: `border border-brand-navy bg-brand-navy text-brand-gold hover:bg-brand-dark ${off}`,
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    icon: 'h-12 min-w-12 px-0 text-sm', // a round icon-only button
  };

  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const content = (
    <>
      {loading && <Spinner size="sm" label="Loading" />}
      {children}
    </>
  );

  if (to !== undefined) {
    return (
      <Link to={to} onClick={onClick} className={classes} aria-disabled={disabled || undefined} {...rest}>
        {content}
      </Link>
    );
  }

  if (href !== undefined) {
    return (
      <a href={href} onClick={onClick} className={classes} aria-disabled={disabled || undefined} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} disabled={disabled || loading} onClick={onClick} className={classes} {...rest}>
      {content}
    </button>
  );
}

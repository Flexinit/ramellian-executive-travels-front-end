import React from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

/**
 * The one button for the whole portal — the Figma design system's button ("Book Now"): a solid charcoal
 * pill with white, semibold `text-sm`. Use it for every button and every link that looks like one, rather
 * than styling a `<button>` or `<Link>` by hand.
 *
 * Pass `to` to render a router link (same look, real `<a>`), or `href` for an
 * external link; otherwise it's a `<button>`.
 *
 * @param {'default'|'outline'|'danger'|'dark'|'navy'} variant
 *   default — the solid accent pill (Ramellian navy), for every main action (there is no text-only version);
 *   outline — the same pill in white with a grey outline (the design's unselected pill), for a quieter action
 *   beside a main one; danger — the pill outlined in red, for destructive actions; dark — a white pill with
 *   navy text, only on a navy or dark surface; navy — kept for older call sites, same as default.
 * @param {'xs'|'sm'|'md'|'lg'|'icon'} size — md is the usual size; xs is the small pill on a car card; icon is a round icon-only button
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
    'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface cursor-pointer select-none active:scale-95';

  const off = 'disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none';

  const filled = `border border-accent bg-accent text-on-accent hover:bg-accent-hover hover:border-accent-hover ${off}`;
  const variants = {
    default: filled,
    outline: `border border-line bg-surface text-ink hover:border-accent ${off}`,
    danger: `border border-red-500 text-red-600 bg-surface hover:bg-red-50 ${off}`,
    dark: `border border-on-accent bg-on-accent text-accent hover:bg-on-accent/90 ${off}`,
    navy: filled,
  };

  const sizes = {
    xs: 'px-3 py-1.5 text-[11px] whitespace-nowrap', // the design's small "Book now" pill on a car card
    // A short label never breaks over two lines (e.g. "Log In" on a phone set to large text).
    sm: 'px-4 py-1.5 text-sm whitespace-nowrap',
    md: 'px-5 py-2.5 text-sm whitespace-nowrap',
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

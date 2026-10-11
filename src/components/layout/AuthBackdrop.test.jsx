// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import AuthBackdrop from './AuthBackdrop';

describe('AuthBackdrop', () => {
  it('shows the photo behind the content, hidden from screen readers', () => {
    render(
      <AuthBackdrop image="/photo.jpg">
        <p>Card</p>
      </AuthBackdrop>
    );
    const backdrop = screen.getByTestId('auth-backdrop');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop.querySelector('img')).toHaveAttribute('src', '/photo.jpg');
    expect(backdrop.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.getByText('Card')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <AuthBackdrop image="/photo.jpg">
        <h1>Welcome</h1>
      </AuthBackdrop>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoogleSignInButton from './GoogleSignInButton';

vi.mock('../../lib/features', () => ({ isGoogleSignInEnabled: () => true, googleClientId: () => 'test-client' }));
vi.mock('../../lib/googleIdentity', () => ({
  loadGoogleIdentity: () => Promise.resolve({ initialize() {}, renderButton() {} }),
}));

describe('GoogleSignInButton', () => {
  it('shows that the Google sign-in is under way, over the button', () => {
    render(<GoogleSignInButton onCredential={() => {}} loading />);
    expect(screen.getByRole('status', { name: 'Signing you in with Google' })).toBeInTheDocument();
    expect(screen.getByText('Signing you in with Google…')).toBeInTheDocument();
  });

  it('shows no spinner otherwise', () => {
    render(<GoogleSignInButton onCredential={() => {}} />);
    expect(screen.queryByText('Signing you in with Google…')).not.toBeInTheDocument();
  });
});

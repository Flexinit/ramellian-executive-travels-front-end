// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import ProfilePhotoPicker from './ProfilePhotoPicker';
import { useAuthStore } from '../../store/authStore';
import { useProfilePhotoStore } from '../../store/profilePhotoStore';

function signIn(id = 'u1') {
  act(() => {
    useAuthStore.setState({ token: 'tok', user: { id, email: 'test@example.com', roles: ['RENTER'] } });
  });
}

beforeEach(() => {
  localStorage.clear();
  useProfilePhotoStore.setState({ photoUrl: null, userId: null });
});

afterEach(() => {
  act(() => useAuthStore.getState().clearAuth());
});

describe('ProfilePhotoPicker', () => {
  it('shows initials when no photo has been set', () => {
    signIn();
    render(<ProfilePhotoPicker name="John Kamau" />);
    expect(screen.getByText('JK')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('uploading an image updates the avatar immediately', async () => {
    signIn();
    const user = userEvent.setup();
    render(<ProfilePhotoPicker name="John Kamau" />);

    const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/upload profile photo/i);
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument());
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,'));
  });

  it('persists the photo to localStorage for this user', async () => {
    signIn('u1');
    const user = userEvent.setup();
    render(<ProfilePhotoPicker name="John Kamau" />);

    const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/upload profile photo/i), file);

    await waitFor(() =>
      expect(localStorage.getItem('ramellian:profilePhoto:u1')).toMatch(/^data:image\/png;base64,/)
    );
  });

  it('rejects a non-image file without updating the avatar', async () => {
    signIn();
    const user = userEvent.setup();
    render(<ProfilePhotoPicker name="John Kamau" />);

    const file = new File(['not an image'], 'notes.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText(/upload profile photo/i), file);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JK')).toBeInTheDocument();
  });

  it('shows a remove button once a photo is set, which clears it back to initials', async () => {
    signIn();
    const user = userEvent.setup();
    render(<ProfilePhotoPicker name="John Kamau" />);

    const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/upload profile photo/i), file);
    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /remove profile photo/i }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JK')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    signIn();
    const { container } = render(<ProfilePhotoPicker name="John Kamau" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

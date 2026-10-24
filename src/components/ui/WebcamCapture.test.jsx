import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import WebcamCapture, { prefersWebcamWindow } from './WebcamCapture';

const original = navigator.mediaDevices;
function mockCamera(getUserMedia) {
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
}
afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', { value: original, configurable: true });
});

describe('WebcamCapture', () => {
  it('shows the live camera preview and switches the camera off when closed', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    mockCamera(getUserMedia);
    const { rerender } = render(<WebcamCapture isOpen onClose={() => {}} onCapture={() => {}} hint="Hold your ID up" />);

    expect(await screen.findByLabelText('Camera preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument();
    expect(screen.getByText('Hold your ID up')).toBeInTheDocument();
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false })));

    rerender(<WebcamCapture isOpen={false} onClose={() => {}} onCapture={() => {}} />);
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it('says how to allow the camera when it was blocked', async () => {
    mockCamera(vi.fn().mockRejectedValue(Object.assign(new Error('no'), { name: 'NotAllowedError' })));
    render(<WebcamCapture isOpen onClose={() => {}} onCapture={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/camera access was blocked/i);
  });

  it('suggests uploading when there is no camera', async () => {
    mockCamera(vi.fn().mockRejectedValue(Object.assign(new Error('none'), { name: 'NotFoundError' })));
    render(<WebcamCapture isOpen onClose={() => {}} onCapture={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/upload a photo instead/i);
  });

  it('is only preferred where the browser can use a camera', () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    expect(prefersWebcamWindow()).toBe(false);
  });
});

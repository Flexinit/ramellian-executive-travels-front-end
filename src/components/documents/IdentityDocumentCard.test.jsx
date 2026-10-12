import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdentityDocumentCard from './IdentityDocumentCard';

const readIdNumber = vi.fn();
const uploadDoc = vi.fn();
const updateProfile = vi.fn();

vi.mock('../../lib/identity', async (importOriginal) => ({ ...(await importOriginal()), readIdNumber: (...a) => readIdNumber(...a) }));
vi.mock('../../lib/composeFrontBack', () => ({ composePanels: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })) }));
vi.mock('../../hooks/useDocuments', () => ({ useUploadDocument: () => ({ mutateAsync: uploadDoc }) }));
vi.mock('../../hooks/useProfile', () => ({ useUpdateProfile: () => ({ mutateAsync: updateProfile }) }));
vi.mock('./DocumentFilePreview', () => ({ default: () => null }));

const photo = (name) => new File(['img'], `${name}.jpg`, { type: 'image/jpeg' });

beforeEach(() => {
  readIdNumber.mockReset();
  uploadDoc.mockReset().mockResolvedValue({});
  updateProfile.mockReset().mockResolvedValue({});
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('IdentityDocumentCard', () => {
  it('fills the ID number from the photo — not typeable — and uploads the ID with both selfies', async () => {
    readIdNumber.mockResolvedValue('12345678');
    const user = userEvent.setup();
    render(<IdentityDocumentCard documents={[]} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText('Front of your ID'), photo('front'));
    expect(await screen.findByLabelText('ID number')).toHaveTextContent('12345678');

    const submit = screen.getByRole('button', { name: /submit national id/i });
    expect(submit).toBeDisabled();
    await user.upload(screen.getByLabelText('Back of your ID'), photo('back'));
    await user.upload(screen.getByLabelText('Selfie holding the front'), photo('s1'));
    await user.upload(screen.getByLabelText('Selfie holding the back'), photo('s2'));
    await user.click(submit);

    await waitFor(() => expect(uploadDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'NATIONAL_ID' })));
    expect(updateProfile).toHaveBeenCalledWith({ idNumber: '12345678' });
  });

  it("asks for a clearer photo when the number can't be read, and won't submit", async () => {
    readIdNumber.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<IdentityDocumentCard documents={[]} />);

    await user.upload(screen.getByLabelText('Front of your ID'), photo('front'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't read the id number/i);
    await user.upload(screen.getByLabelText('Back of your ID'), photo('back'));
    await user.upload(screen.getByLabelText('Selfie holding the front'), photo('s1'));
    await user.upload(screen.getByLabelText('Selfie holding the back'), photo('s2'));
    expect(screen.getByRole('button', { name: /submit national id/i })).toBeDisabled();
  });

  it('takes a Passport instead — the photo page and one selfie', async () => {
    readIdNumber.mockResolvedValue('AK1234567');
    const user = userEvent.setup();
    render(<IdentityDocumentCard documents={[]} currentIdNumber="AK1234567" />);

    await user.click(screen.getByRole('button', { name: 'Passport' }));
    expect(screen.queryByLabelText('Back of your ID')).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText('Passport photo page'), photo('page'));
    expect(await screen.findByLabelText('Passport number')).toHaveTextContent('AK1234567');
    await user.upload(screen.getByLabelText('Selfie holding the photo page'), photo('selfie'));
    await user.click(screen.getByRole('button', { name: /submit passport/i }));

    await waitFor(() => expect(uploadDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'PASSPORT' })));
    expect(updateProfile).not.toHaveBeenCalled(); // already on file
  });

  it('shows the passport already on file instead of asking again', () => {
    render(<IdentityDocumentCard documents={[{ id: 'd1', type: 'PASSPORT', status: 'PENDING' }]} />);
    expect(screen.getByText(/passport uploaded/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });
});

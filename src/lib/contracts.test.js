import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import { api } from './api';
import { fetchContractBlob, downloadContract } from './contracts';

beforeEach(() => {
  // jsdom doesn't implement createObjectURL/revokeObjectURL at all, so there's nothing for spyOn to
  // wrap — define them first.
  URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(toast, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchContractBlob', () => {
  it('fetches the document endpoint as a blob, for the signed or unsigned copy', async () => {
    const blob = new Blob(['pdf-bytes']);
    vi.spyOn(api, 'get').mockResolvedValue({ data: blob });

    const result = await fetchContractBlob('c1', true);

    expect(api.get).toHaveBeenCalledWith('/payments/contracts/c1/document', {
      params: { signed: true },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });
});

describe('downloadContract', () => {
  it('triggers a browser download of the fetched blob', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: new Blob(['pdf-bytes']) });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadContract('c1', false);

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('shows an error toast if the fetch fails, rather than throwing', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('network'));

    await downloadContract('c1', false);

    expect(toast.error).toHaveBeenCalledWith('Could not download the contract.');
  });
});

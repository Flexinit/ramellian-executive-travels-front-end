// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import PageTitle from './PageTitle';

function renderTitle(props) {
  return render(
    <HelmetProvider>
      <PageTitle {...props} />
    </HelmetProvider>
  );
}

describe('PageTitle', () => {
  it('sets the document title with the site name suffix', async () => {
    renderTitle({ title: 'Contact Us' });
    await waitFor(() => expect(document.title).toBe('Contact Us | Ramellian Executive Travels'));
  });

  it('falls back to the bare site name when no title is given', async () => {
    renderTitle({});
    await waitFor(() => expect(document.title).toBe('Ramellian Executive Travels'));
  });
});

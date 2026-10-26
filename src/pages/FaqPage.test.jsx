// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe } from 'jest-axe';
import FaqPage from './FaqPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <FaqPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('FaqPage', () => {
  it('renders every question, with the first one expanded by default', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /how do i rent a car with ramellian/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText(/press book now/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /do you offer long-distance or upcountry trips/i })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands a question and collapses it again on click', async () => {
    const user = userEvent.setup();
    renderPage();
    const trigger = screen.getByRole('button', { name: /how do i pay for a booking/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/securely online through pesapal/i)).toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('links to the contact page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute('href', '/contact');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

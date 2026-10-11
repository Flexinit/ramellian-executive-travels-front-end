// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractTemplateEditor from './ContractTemplateEditor';
import { PLATFORM_LIABILITY_CLAUSE, withPlatformClause } from '../../lib/contractBoilerplate';

describe('ContractTemplateEditor — the platform clause every contract starts with', () => {
  it('shows the fixed platform clause, read-only, above the editable body', () => {
    render(<ContractTemplateEditor onSave={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByText(/ramellian platform terms/i)).toBeInTheDocument();
    expect(screen.getByText(/not editable here/i)).toBeInTheDocument();
    // It's shown as plain text, not inside the editable textarea.
    expect(screen.getByLabelText(/contract body/i)).toHaveValue('');
  });

  it('strips the clause back out of an existing template so the owner only edits their own text', () => {
    render(
      <ContractTemplateEditor
        template={{ name: 'Standard', content: withPlatformClause('My own rental terms go here.') }}
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/contract body/i)).toHaveValue('My own rental terms go here.');
  });

  it('re-prepends the clause when saving, so it reaches the backend as part of the one stored string', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ContractTemplateEditor onSave={onSave} onDiscard={vi.fn()} />);

    await user.type(screen.getByLabelText(/template name/i), 'Standard');
    await user.type(screen.getByLabelText(/contract body/i), 'My own rental terms.');
    await user.click(screen.getByRole('button', { name: /save template/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Standard',
      content: `${PLATFORM_LIABILITY_CLAUSE}\n\n---\n\nMy own rental terms.`,
    });
  });

  it('keeps Save disabled until both a name and a body are given', () => {
    render(<ContractTemplateEditor onSave={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save template/i })).toBeDisabled();
  });
});

import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { Form, Field, ConfirmDelete } from '../src/components/ui';
afterEach(cleanup);
it('preserves form input after failed saves and exposes recoverable error', async () => {
    render(<Form save={async () => {
        throw new Error('Conflict: reload the latest data');
    }}><Field label="Venue name"><input defaultValue="Blue Note"/></Field></Form>);
    fireEvent.click(screen.getByText('Save changes'));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Venue name')).toHaveValue('Blue Note');
    expect(screen.getByRole('alert')).toHaveTextContent('reload');
});
it('blocks duplicate submissions', async () => {
    let done!: () => void;
    const save = vi.fn(() => new Promise<void>(r => {
        done = r;
    }));
    render(<Form save={save}><input aria-label="Name"/></Form>);
    const b = screen.getByText('Save changes');
    fireEvent.click(b);
    fireEvent.click(b);
    expect(save).toHaveBeenCalledTimes(1);
    done();
    await waitFor(() => expect(screen.getByText('Save changes')).toBeEnabled());
});
it('blocks unsafe writes when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const save = vi.fn();
    render(<Form save={save}/>);
    expect(screen.getByText('Save changes')).toBeDisabled();
    fireEvent.click(screen.getByText('Save changes'));
    expect(save).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});
it('names the venue and dependent data before permanent deletion', () => {
    const action = vi.fn();
    render(<ConfirmDelete name="Blue Note" detail="All gigs and payments will also be removed." action={action}/>);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByRole('region')).toHaveTextContent('Blue Note');
    expect(screen.getByRole('region')).toHaveTextContent('gigs and payments');
    expect(action).not.toHaveBeenCalled();
});
it('keeps select labels independent of options and validation text',()=>{
 render(<Field label="Response" error="Choose a response"><select defaultValue=""><option value="">Select response</option><option>Gig confirmed</option></select></Field>);
 expect(screen.getByLabelText('Response',{exact:true})).toBe(screen.getByRole('combobox',{name:'Response'}));
 expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Choose a response');
});

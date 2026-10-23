// @vitest-environment jsdom
//
// The first-visit dialog on the home page: each choice calls its own handler,
// and dismissing without choosing counts as "I run a server" rather than
// trapping the visitor or sending them to the developer portal.
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';

import ExperienceSplash from '../components/ExperienceSplash';

afterEach(cleanup);

const renderSplash = (open = true) => {
    const onChoosePlayer = vi.fn();
    const onChooseDeveloper = vi.fn();
    render(<ExperienceSplash open={open} onChoosePlayer={onChoosePlayer} onChooseDeveloper={onChooseDeveloper}/>);
    return {onChoosePlayer, onChooseDeveloper};
};

describe('ExperienceSplash', () => {
    it('renders nothing while closed', () => {
        renderSplash(false);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.queryByText(/Welcome to Dan/)).toBeNull();
    });

    it('asks what brings the visitor here and offers both choices', () => {
        renderSplash();
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByRole('heading', {name: 'Welcome to Dan\'s Plugins Community'})).toBeTruthy();
        expect(screen.getByRole('button', {name: /I run a server/})).toBeTruthy();
        expect(screen.getByRole('button', {name: /I build plugins/})).toBeTruthy();
        expect(screen.getByText('You can switch anytime from the Dev Portal link in the top navigation.')).toBeTruthy();
    });

    it('calls only the player handler for "I run a server"', () => {
        const {onChoosePlayer, onChooseDeveloper} = renderSplash();
        fireEvent.click(screen.getByRole('button', {name: /I run a server/}));
        expect(onChoosePlayer).toHaveBeenCalledTimes(1);
        expect(onChooseDeveloper).not.toHaveBeenCalled();
    });

    it('calls only the developer handler for "I build plugins"', () => {
        const {onChoosePlayer, onChooseDeveloper} = renderSplash();
        fireEvent.click(screen.getByRole('button', {name: /I build plugins/}));
        expect(onChooseDeveloper).toHaveBeenCalledTimes(1);
        expect(onChoosePlayer).not.toHaveBeenCalled();
    });

    it('treats Escape as choosing the plugin catalogue', () => {
        const {onChoosePlayer, onChooseDeveloper} = renderSplash();
        fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
        expect(onChoosePlayer).toHaveBeenCalledTimes(1);
        expect(onChooseDeveloper).not.toHaveBeenCalled();
    });
});

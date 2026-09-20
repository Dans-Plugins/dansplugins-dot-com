/**
 * @vitest-environment jsdom
 */
import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';

let query: Record<string, string> = {};
vi.mock('next/router', () => ({useRouter: () => ({pathname: '/account/reset', asPath: '/account/reset', query, push: vi.fn()})}));

import ResetPasswordPage from '../pages/account/reset';

beforeEach(() => {
    query = {};
    window.localStorage.setItem('dpc-token', 'old-jwt');
    window.localStorage.setItem('dpc-refresh-token', 'old-rt');
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
});

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), {target: {value}});

describe('reset password page', () => {
    it('prefills the token from the link an admin sends', async () => {
        query = {token: 'from-link'};
        render(<ResetPasswordPage/>);
        await waitFor(() => expect((screen.getByLabelText(/^Reset token/) as HTMLInputElement).value).toBe('from-link'));
    });

    it('refuses a weak or mismatched password before any request', () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        render(<ResetPasswordPage/>);
        fill(/^Reset token/, 't');
        fill(/^New password/, 'weak');
        fill(/^Confirm new password/, 'weak');
        fireEvent.submit(screen.getByRole('form', {name: 'Reset password'}));
        expect(screen.getByTestId('reset-error').textContent).toContain('stronger password');
        fill(/^New password/, 'NewPassword1!');
        fill(/^Confirm new password/, 'NewPassword2!');
        fireEvent.submit(screen.getByRole('form', {name: 'Reset password'}));
        expect(screen.getByTestId('reset-error').textContent).toContain('do not match');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('submits, clears the local session, and offers sign-in on success', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, status: 204} as Response));
        render(<ResetPasswordPage/>);
        fill(/^Reset token/, ' reset-1 ');
        fill(/^New password/, 'NewPassword1!');
        fill(/^Confirm new password/, 'NewPassword1!');
        fireEvent.submit(screen.getByRole('form', {name: 'Reset password'}));
        await waitFor(() => expect(screen.getByTestId('reset-done')).toBeTruthy());
        expect(window.localStorage.getItem('dpc-token')).toBeNull();
        expect(window.localStorage.getItem('dpc-refresh-token')).toBeNull();
        expect(screen.getByRole('link', {name: /Sign in with your new password/})).toBeTruthy();
    });

    it('shows the refusal for a bad token and keeps the form', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 401} as Response));
        render(<ResetPasswordPage/>);
        fill(/^Reset token/, 'stale');
        fill(/^New password/, 'NewPassword1!');
        fill(/^Confirm new password/, 'NewPassword1!');
        fireEvent.submit(screen.getByRole('form', {name: 'Reset password'}));
        await waitFor(() => expect(screen.getByTestId('reset-error').textContent).toContain('not valid'));
        expect(screen.queryByTestId('reset-done')).toBeNull();
    });
});

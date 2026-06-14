import type {NextPage} from 'next';
import React from 'react';
import ErrorPage from '../components/ErrorPage';

const ServerErrorPage: NextPage = () => (
    <ErrorPage
        code="500"
        title="Something went wrong"
        message="An unexpected error occurred on our end. Please try again in a moment."
    />
);

export default ServerErrorPage;

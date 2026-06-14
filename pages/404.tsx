import type {NextPage} from 'next';
import React from 'react';
import ErrorPage from '../components/ErrorPage';

const NotFoundPage: NextPage = () => (
    <ErrorPage
        code="404"
        title="Page not found"
        message="The page you're looking for doesn't exist or may have moved."
    />
);

export default NotFoundPage;

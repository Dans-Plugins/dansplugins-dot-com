import type { NextApiRequest, NextApiResponse } from 'next';
import pkg from '../../package.json';

// The `version` field of package.json, read by the bundler at build time, so
// the answer is the version this build was made from rather than whatever
// package.json says on disk when the request arrives.
export const BUILD_VERSION: string = pkg.version;

// GET /version.json (rewritten here by next.config.js): the version this
// build was made from, so a deploy can be verified by the version it reports.
// Never cached, so a check after a deploy cannot read a stale answer.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        res.status(405).end();
        return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ version: BUILD_VERSION }));
}

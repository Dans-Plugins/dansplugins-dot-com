import { NextApiRequest, NextApiResponse } from 'next';
import { initializeVisitStorage, getVisitData } from '../../utils/visitStorage';
import { clientAddress } from '../../utils/clientAddress';
import { isSameOriginRequest } from '../../utils/sameOrigin';
import { recordVisit, takePostBudget } from '../../utils/visitCounter';

initializeVisitStorage();

// GET is a read and stays open. POST is the counter's only write over HTTP
// (the home page counts in-process, utils/visitCounter.ts), so it is guarded:
// it must come from one of the site's own pages (utils/sameOrigin.ts), each
// address gets a small budget of requests per minute, and an address counts at
// most once per visit window however often it posts.

// The route takes no body; anything larger than this is refused with 413
// before the handler runs.
export const config = {
    api: {
        bodyParser: { sizeLimit: '1kb' },
    },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        res.status(200).json(getVisitData());
        return;
    }
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({ message: 'Method not allowed' });
        return;
    }
    if (!isSameOriginRequest(req.headers)) {
        res.status(403).json({ message: 'Cross-origin request refused' });
        return;
    }
    const address = clientAddress(req);
    const decision = takePostBudget(address);
    if (!decision.allowed) {
        res.setHeader('Retry-After', String(decision.retryAfterSeconds));
        res.status(429).json({ message: 'Too many requests' });
        return;
    }
    res.status(200).json(recordVisit(address));
}


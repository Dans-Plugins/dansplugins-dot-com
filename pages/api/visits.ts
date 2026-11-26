import { NextApiRequest, NextApiResponse } from 'next';
import {
    methodNotAllowed,
    refuseCrossOriginRequest,
    refuseIfLimited,
    requestAddress,
} from '@kingdom-community/web-guards';
import { initializeVisitStorage, getVisitData } from '../../utils/visitStorage';
import { recordVisit, takePostBudget } from '../../utils/visitCounter';

initializeVisitStorage();

// GET is a read and stays open. POST is the counter's only write over HTTP
// (the home page counts in-process, utils/visitCounter.ts), so it is guarded
// with @kingdom-community/web-guards: it must come from one of the site's own
// pages (its Origin, or Referer when Origin is absent, must match
// NEXT_PUBLIC_BASE_URL), each address gets a small budget of requests per
// minute, and an address counts at most once per visit window however often
// it posts.
//
// The origin check fails closed. With NEXT_PUBLIC_BASE_URL unset, every POST is
// answered 503 and a line is logged; with it set to the wrong origin, every
// real POST is answered 403. It is inlined at BUILD time, so the gateway passes
// it as a build arg (https://dansplugins.com).

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
        methodNotAllowed(res, ['GET', 'POST']);
        return;
    }
    if (refuseCrossOriginRequest(req, res, {
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        baseUrlSetting: 'NEXT_PUBLIC_BASE_URL',
    })) {
        return;
    }
    const address = requestAddress(req);
    if (refuseIfLimited(res, takePostBudget(address), 'Too many requests')) {
        return;
    }
    res.status(200).json(recordVisit(address));
}

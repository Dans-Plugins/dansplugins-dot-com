import {siteBaseUrl} from '../utils/seo';

interface VisitData {
    visits: number;
    startDate: string;
}

export const incrementVisits = async (): Promise<void> => {
    await fetch(`${siteBaseUrl()}/api/visits`, { method: 'POST' });
};

export const getVisits = async (): Promise<VisitData> => {
    const response = await fetch(`${siteBaseUrl()}/api/visits`);
    if (!response.ok) {
        throw new Error(`Failed to fetch visits: ${response.status} ${response.statusText}`);
    }
    return response.json();
};
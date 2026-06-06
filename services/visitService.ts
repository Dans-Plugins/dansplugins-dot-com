interface VisitData {
    visits: number;
    startDate: string;
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const incrementVisits = async (): Promise<void> => {
    await fetch(`${getBaseUrl()}/api/visits`, { method: 'POST' });
};

export const getVisits = async (): Promise<VisitData> => {
    const response = await fetch(`${getBaseUrl()}/api/visits`);
    if (!response.ok) {
        throw new Error(`Failed to fetch visits: ${response.status} ${response.statusText}`);
    }
    return response.json();
};
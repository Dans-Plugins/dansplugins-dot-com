import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

const PLUGINS_FILE = path.join(process.cwd(), 'pages', 'data', 'plugins.json');

interface Plugin {
    id: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink?: string;
    bStatsId?: string;
}

interface PluginData {
    mostPopular: string[];
    plugins: Plugin[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Read and return plugins data
        try {
            const fileContents = await fs.readFile(PLUGINS_FILE, 'utf8');
            const data: PluginData = JSON.parse(fileContents);
            res.status(200).json(data);
        } catch (error) {
            console.error('Error reading plugins file:', error);
            res.status(500).json({ message: 'Error reading plugins data' });
        }
    } else if (req.method === 'POST') {
        // Update plugins data
        try {
            const newData: PluginData = req.body;
            
            // Basic validation
            if (!newData.plugins || !Array.isArray(newData.plugins)) {
                return res.status(400).json({ message: 'Invalid plugins data' });
            }
            
            if (!newData.mostPopular || !Array.isArray(newData.mostPopular)) {
                return res.status(400).json({ message: 'Invalid mostPopular data' });
            }
            
            // Validate each plugin
            for (const plugin of newData.plugins) {
                if (!plugin.id || !plugin.title || !plugin.description || !plugin.githubLink) {
                    return res.status(400).json({ message: 'Each plugin must have id, title, description, and githubLink' });
                }
            }
            
            // Write to file
            await fs.writeFile(PLUGINS_FILE, JSON.stringify(newData, null, 2));
            res.status(200).json({ message: 'Plugins data updated successfully' });
        } catch (error) {
            console.error('Error updating plugins file:', error);
            res.status(500).json({ message: 'Error updating plugins data' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
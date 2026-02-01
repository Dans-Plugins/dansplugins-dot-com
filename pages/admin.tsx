import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    IconButton,
    Card,
    CardContent,
    CardActions,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    DragIndicator as DragIcon
} from '@mui/icons-material';
import type { NextPage } from 'next';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { pageStyle, sectionHeaderStyle, containerPaddingStyle } from '../styles/styles';

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

const emptyPlugin: Plugin = {
    id: '',
    title: '',
    description: '',
    githubLink: '',
    spigotmcLink: '',
    bStatsId: ''
};

const Admin: NextPage = () => {
    const [pluginData, setPluginData] = useState<PluginData>({ plugins: [], mostPopular: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isNewPlugin, setIsNewPlugin] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [pluginToDelete, setPluginToDelete] = useState<string | null>(null);
    const version = process.env.NEXT_PUBLIC_VERSION || 'dev';

    useEffect(() => {
        fetchPluginData();
    }, []);

    const fetchPluginData = async () => {
        try {
            const response = await fetch('/api/plugins');
            if (response.ok) {
                const data = await response.json();
                setPluginData(data);
            } else {
                setMessage({ type: 'error', text: 'Failed to load plugin data' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error loading plugin data' });
        } finally {
            setLoading(false);
        }
    };

    const savePluginData = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/plugins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pluginData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Plugin data saved successfully!' });
            } else {
                const errorData = await response.json();
                setMessage({ type: 'error', text: errorData.message || 'Failed to save plugin data' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving plugin data' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddPlugin = () => {
        setEditingPlugin({ ...emptyPlugin });
        setIsNewPlugin(true);
        setIsDialogOpen(true);
    };

    const handleEditPlugin = (plugin: Plugin) => {
        setEditingPlugin({ ...plugin });
        setIsNewPlugin(false);
        setIsDialogOpen(true);
    };

    const handleDeletePlugin = (pluginId: string) => {
        setPluginToDelete(pluginId);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!pluginToDelete) return;
        
        const updatedPlugins = pluginData.plugins.filter(p => p.id !== pluginToDelete);
        const updatedMostPopular = pluginData.mostPopular.filter(id => id !== pluginToDelete);
        setPluginData({
            plugins: updatedPlugins,
            mostPopular: updatedMostPopular
        });
        
        setDeleteConfirmOpen(false);
        setPluginToDelete(null);
    };

    const cancelDelete = () => {
        setDeleteConfirmOpen(false);
        setPluginToDelete(null);
    };

    const handleSavePlugin = () => {
        if (!editingPlugin) return;

        // Validate required fields
        if (!editingPlugin.id || !editingPlugin.title || !editingPlugin.description || !editingPlugin.githubLink) {
            setMessage({ type: 'error', text: 'Please fill in all required fields (ID, Title, Description, GitHub Link)' });
            return;
        }

        if (isNewPlugin) {
            // Check if ID already exists
            if (pluginData.plugins.some(p => p.id === editingPlugin.id)) {
                setMessage({ type: 'error', text: 'Plugin ID already exists' });
                return;
            }
            setPluginData({
                ...pluginData,
                plugins: [...pluginData.plugins, editingPlugin]
            });
        } else {
            const updatedPlugins = pluginData.plugins.map(p => 
                p.id === editingPlugin.id ? editingPlugin : p
            );
            setPluginData({
                ...pluginData,
                plugins: updatedPlugins
            });
        }

        setIsDialogOpen(false);
        setEditingPlugin(null);
    };

    const handleCancelEdit = () => {
        setIsDialogOpen(false);
        setEditingPlugin(null);
    };

    const movePluginInMostPopular = (pluginId: string, direction: 'up' | 'down') => {
        const currentIndex = pluginData.mostPopular.indexOf(pluginId);
        if (currentIndex === -1) return;

        const newMostPopular = [...pluginData.mostPopular];
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex >= 0 && newIndex < newMostPopular.length) {
            [newMostPopular[currentIndex], newMostPopular[newIndex]] = 
            [newMostPopular[newIndex], newMostPopular[currentIndex]];
            
            setPluginData({
                ...pluginData,
                mostPopular: newMostPopular
            });
        }
    };

    const addToMostPopular = (pluginId: string) => {
        if (!pluginData.mostPopular.includes(pluginId)) {
            setPluginData({
                ...pluginData,
                mostPopular: [...pluginData.mostPopular, pluginId]
            });
        }
    };

    const removeFromMostPopular = (pluginId: string) => {
        setPluginData({
            ...pluginData,
            mostPopular: pluginData.mostPopular.filter(id => id !== pluginId)
        });
    };

    if (loading) {
        return (
            <Box sx={pageStyle}>
                <TopBar />
                <Container maxWidth="xl" sx={containerPaddingStyle}>
                    <Typography variant="h3">Loading...</Typography>
                </Container>
                <BottomBar version={version} />
            </Box>
        );
    }

    return (
        <Box sx={pageStyle}>
            <TopBar />
            <Container maxWidth="xl" sx={containerPaddingStyle}>
                <Typography variant="h3" gutterBottom sx={sectionHeaderStyle}>
                    Admin - Plugin Management
                </Typography>

                {message && (
                    <Alert 
                        severity={message.type} 
                        sx={{ mb: 3 }}
                        onClose={() => setMessage(null)}
                    >
                        {message.text}
                    </Alert>
                )}

                <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddPlugin}
                    >
                        Add New Plugin
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        onClick={savePluginData}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </Button>
                </Box>

                <Grid container spacing={3}>
                    {/* Plugins List */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h4" gutterBottom>
                                All Plugins ({pluginData.plugins.length})
                            </Typography>
                            <Grid container spacing={2}>
                                {pluginData.plugins.map((plugin) => (
                                    <Grid item xs={12} sm={6} key={plugin.id}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    {plugin.title}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    ID: {plugin.id}
                                                </Typography>
                                                <Typography variant="body2">
                                                    {plugin.description}
                                                </Typography>
                                            </CardContent>
                                            <CardActions>
                                                <Button
                                                    size="small"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => handleEditPlugin(plugin)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    startIcon={<DeleteIcon />}
                                                    onClick={() => handleDeletePlugin(plugin.id)}
                                                >
                                                    Delete
                                                </Button>
                                                {!pluginData.mostPopular.includes(plugin.id) && (
                                                    <Button
                                                        size="small"
                                                        onClick={() => addToMostPopular(plugin.id)}
                                                    >
                                                        Add to Popular
                                                    </Button>
                                                )}
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Most Popular Plugins */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h4" gutterBottom>
                                Most Popular Order
                            </Typography>
                            <List>
                                {pluginData.mostPopular.map((pluginId, index) => {
                                    const plugin = pluginData.plugins.find(p => p.id === pluginId);
                                    return (
                                        <ListItem key={pluginId} sx={{ border: 1, borderColor: 'divider', mb: 1 }}>
                                            <ListItemText
                                                primary={plugin?.title || pluginId}
                                                secondary={`Position ${index + 1}`}
                                            />
                                            <ListItemSecondaryAction>
                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Button
                                                        size="small"
                                                        disabled={index === 0}
                                                        onClick={() => movePluginInMostPopular(pluginId, 'up')}
                                                    >
                                                        ↑
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        disabled={index === pluginData.mostPopular.length - 1}
                                                        onClick={() => movePluginInMostPopular(pluginId, 'down')}
                                                    >
                                                        ↓
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        onClick={() => removeFromMostPopular(pluginId)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </Box>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Edit Dialog */}
                <Dialog open={isDialogOpen} onClose={handleCancelEdit} maxWidth="md" fullWidth>
                    <DialogTitle>
                        {isNewPlugin ? 'Add New Plugin' : 'Edit Plugin'}
                    </DialogTitle>
                    <DialogContent>
                        {editingPlugin && (
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Plugin ID *"
                                        value={editingPlugin.id}
                                        onChange={(e) => setEditingPlugin({
                                            ...editingPlugin,
                                            id: e.target.value
                                        })}
                                        disabled={!isNewPlugin}
                                        helperText="Unique identifier (cannot be changed after creation)"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Title *"
                                        value={editingPlugin.title}
                                        onChange={(e) => setEditingPlugin({
                                            ...editingPlugin,
                                            title: e.target.value
                                        })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Description *"
                                        value={editingPlugin.description}
                                        onChange={(e) => setEditingPlugin({
                                            ...editingPlugin,
                                            description: e.target.value
                                        })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="GitHub Link *"
                                        value={editingPlugin.githubLink}
                                        onChange={(e) => setEditingPlugin({
                                            ...editingPlugin,
                                            githubLink: e.target.value
                                        })}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="SpigotMC Link (optional)"
                                        value={editingPlugin.spigotmcLink || ''}
                                        onChange={(e) => setEditingPlugin({
                                            ...editingPlugin,
                                            spigotmcLink: e.target.value
                                        })}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="bStats ID (optional)"
                                        value={editingPlugin.bStatsId || ''}
                                        onChange={(e) => setEditingPlugin({
                                            ...editingPlugin,
                                            bStatsId: e.target.value
                                        })}
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelEdit} startIcon={<CancelIcon />}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePlugin} variant="contained" startIcon={<SaveIcon />}>
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmOpen} onClose={cancelDelete}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to delete this plugin? This action cannot be undone.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={cancelDelete}>
                            Cancel
                        </Button>
                        <Button onClick={confirmDelete} color="error" variant="contained">
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
            <BottomBar version={version} />
        </Box>
    );
};

export default Admin;
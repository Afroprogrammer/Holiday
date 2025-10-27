import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    CircularProgress
} from '@mui/material';
import { Send } from '@mui/icons-material';

const ItineraryGenerator = ({ onItineraryGenerated, isLoading }) => {
    const [destination, setDestination] = useState('');
    const [details, setDetails] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (destination.trim()) {
            onItineraryGenerated(destination, details);
        }
    };

    return (
        <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                    Create Your Itinerary
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Destination"
                        placeholder="Enter destination (e.g., Paris for 3 days)"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        margin="normal"
                        variant="outlined"
                    />

                    <TextField
                        fullWidth
                        label="Details (Optional)"
                        placeholder="Optional details (e.g., interests like food and history)"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        margin="normal"
                        multiline
                        rows={3}
                        variant="outlined"
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={!destination.trim() || isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
                        sx={{ mt: 2 }}
                    >
                        {isLoading ? 'Generating...' : 'Generate Itinerary'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ItineraryGenerator;
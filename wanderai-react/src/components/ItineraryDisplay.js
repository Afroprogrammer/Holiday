import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Paper
} from '@mui/material';
import { Map } from '@mui/icons-material';

const ItineraryDisplay = ({ itinerary }) => {
    if (!itinerary) {
        return null;
    }

    return (
        <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Map sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" color="primary">
                        Your Itinerary
                    </Typography>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 2
                    }}
                >
                    <Typography
                        variant="body1"
                        sx={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6
                        }}
                    >
                        {itinerary}
                    </Typography>
                </Paper>
            </CardContent>
        </Card>
    );
};

export default ItineraryDisplay;
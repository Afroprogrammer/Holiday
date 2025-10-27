import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { TravelExplore } from '@mui/icons-material';

const Header = () => {
    return (
        <AppBar position="static" elevation={2}>
            <Toolbar>
                <TravelExplore sx={{ mr: 2 }} />
                <Box>
                    <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                        WanderAI
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Your AI-Powered Offline Travel Planner
                    </Typography>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
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
import { Edit } from '@mui/icons-material';

const PlanCustomizer = ({ currentPlan, onPlanRewritten, isLoading }) => {
    const [rewriteInstructions, setRewriteInstructions] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (rewriteInstructions.trim() && currentPlan) {
            onPlanRewritten(rewriteInstructions);
        }
    };

    return (
        <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                    Customize Your Plan
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Rewrite Instructions"
                        placeholder="e.g., Rewrite for a low budget, Make it more adventurous"
                        value={rewriteInstructions}
                        onChange={(e) => setRewriteInstructions(e.target.value)}
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
                        disabled={!rewriteInstructions.trim() || !currentPlan || isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} /> : <Edit />}
                        sx={{ mt: 2 }}
                    >
                        {isLoading ? 'Rewriting...' : 'Rewrite Plan'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default PlanCustomizer;
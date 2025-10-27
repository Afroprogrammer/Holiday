import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    CircularProgress,
    Paper
} from '@mui/material';
import { Summarize } from '@mui/icons-material';

const TextSummarizer = ({ isLoading, onSummarize }) => {
    const [textToSummarize, setTextToSummarize] = useState('');
    const [summary, setSummary] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (textToSummarize.trim()) {
            const result = await onSummarize(textToSummarize);
            setSummary(result);
        }
    };

    return (
        <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                    Text Summarizer
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Text to Summarize"
                        placeholder="Enter text to summarize (e.g., itinerary details)"
                        value={textToSummarize}
                        onChange={(e) => setTextToSummarize(e.target.value)}
                        margin="normal"
                        multiline
                        rows={4}
                        variant="outlined"
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={!textToSummarize.trim() || isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} /> : <Summarize />}
                        sx={{ mt: 2 }}
                    >
                        {isLoading ? 'Summarizing...' : 'Summarize Text'}
                    </Button>
                </Box>

                {summary && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            mt: 2,
                            backgroundColor: 'grey.50',
                            border: '1px solid',
                            borderColor: 'grey.200',
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Summary:
                        </Typography>
                        <Typography variant="body1">
                            {summary}
                        </Typography>
                    </Paper>
                )}
            </CardContent>
        </Card>
    );
};

export default TextSummarizer;
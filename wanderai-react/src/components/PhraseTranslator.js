import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    CircularProgress,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { Translate } from '@mui/icons-material';

const PhraseTranslator = ({ isLoading, onTranslate }) => {
    const [phrase, setPhrase] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('es');
    const [translation, setTranslation] = useState('');

    const languages = [
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (phrase.trim()) {
            const result = await onTranslate(phrase, targetLanguage);
            setTranslation(result);
        }
    };

    return (
        <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                    Phrase Translator
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Phrase"
                        placeholder="Enter phrase to translate (e.g., 'Hello')"
                        value={phrase}
                        onChange={(e) => setPhrase(e.target.value)}
                        margin="normal"
                        variant="outlined"
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Language</InputLabel>
                        <Select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            label="Language"
                        >
                            {languages.map((lang) => (
                                <MenuItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={!phrase.trim() || isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} /> : <Translate />}
                        sx={{ mt: 2 }}
                    >
                        {isLoading ? 'Translating...' : 'Translate Phrase'}
                    </Button>
                </Box>

                {translation && (
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
                            Translation:
                        </Typography>
                        <Typography variant="body1">
                            {translation}
                        </Typography>
                    </Paper>
                )}
            </CardContent>
        </Card>
    );
};

export default PhraseTranslator;
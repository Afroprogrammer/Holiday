import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import Header from './components/Header';
import ItineraryGenerator from './components/ItineraryGenerator';
import ItineraryDisplay from './components/ItineraryDisplay';

function App() {
  const [currentItinerary, setCurrentItinerary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleItineraryGenerated = async (destination, details) => {
    setIsLoading(true);
    // For now, we'll use a mock response
    setTimeout(() => {
      const mockItinerary = `🌟 3-Day ${destination} Travel Itinerary\n\nDay 1: Arrival & City Center\n• Morning: Arrive and check into hotel\n• Afternoon: Explore main attractions\n• Evening: Local dining experience\n\nDay 2: Cultural Exploration\n• Morning: Museum visits\n• Afternoon: Historic district tour\n• Evening: Traditional entertainment\n\nDay 3: Local Experiences\n• Morning: Local markets\n• Afternoon: Scenic views and photos\n• Evening: Departure preparation\n\n${details ? `\nSpecial interests: ${details}` : ''}`;

      setCurrentItinerary(mockItinerary);
      setIsLoading(false);
    }, 2000);
  };

  return (
      <Box>
        <Header />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <ItineraryGenerator
              onItineraryGenerated={handleItineraryGenerated}
              isLoading={isLoading}
          />
          <ItineraryDisplay itinerary={currentItinerary} />
        </Container>
      </Box>
  );
}

export default App;
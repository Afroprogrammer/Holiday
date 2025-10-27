document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const rewriteBtn = document.getElementById('rewriteBtn');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const translateBtn = document.getElementById('translateBtn');
    const destinationInput = document.getElementById('destinationInput');
    const detailsInput = document.getElementById('detailsInput');
    const rewriteInput = document.getElementById('rewriteInput');
    const summaryInput = document.getElementById('summaryInput');
    const phraseInput = document.getElementById('phraseInput');
    const langSelect = document.getElementById('langSelect');
    const itineraryOutput = document.getElementById('itineraryOutput');

    let currentPlan = '';

    async function initAI() {
        if ('ai' in navigator) {
            console.log('Built-in AI is supported:', await navigator.ai.getCapabilities());
        } else {
            console.error('navigator.ai is not defined. Ensure Chrome 130+, Experimental Web Platform Features enabled, valid origin-trial tokens, and compatible hardware.');
            alert('Built-in AI not supported. Check Chrome settings (chrome://flags) and ensure you’re on http://localhost:5500.');
        }
    }

    // In app.js, update generateItinerary (apply similarly to summarizeAttraction, translatePhrase, rewritePlan)
async function generateItinerary(destination, details) {
    if (destination.length > 100) return 'Destination too long (max 100 characters).';
    if (details.length > 1000) return 'Details too long (max 1000 characters).';
    if ('ai' in navigator && navigator.userActivation.isActive) {
        try {
            const writer = await navigator.ai.writer.create();
            return await writer.write(`Create a detailed 3-day travel itinerary for ${destination}.`, details);
        } catch (error) {
            console.error('On-device Writer API failed:', error);
        }
    }
    console.warn('Falling back to Gemini API due to unavailable on-device AI.');
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_API_KEY', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Create a detailed 3-day travel itinerary for ${destination}. Include: ${details || 'general interests'}.` }] }]
            })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API fallback failed:', error);
        return 'Could not generate itinerary. Check network or API key.';
    }
}

// Update initAI for better debugging
async function initAI() {
    if (!navigator.userActivation.isActive) {
        console.warn('User activation required for AI APIs. Click a button first.');
        return;
    }
    if ('ai' in navigator) {
        try {
            const caps = await navigator.ai.getCapabilities();
            console.log('AI Capabilities:', caps);
            if (caps.available !== 'readily') {
                console.warn('Model not ready. Attempting to trigger download...');
                await navigator.ai.writer.create(); // Trigger model download
            }
        } catch (error) {
            console.error('Capabilities error:', error);
        }
    } else {
        console.error('navigator.ai undefined. Ensure Chrome 130+, Experimental Web Platform Features enabled, valid origin-trial tokens, and compatible hardware.');
        alert('Built-in AI not supported. Using cloud fallback. Check chrome://flags and chrome://components.');
    }
}
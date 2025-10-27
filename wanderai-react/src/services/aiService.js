// AI Service - Direct port from your app.js
export class AIService {
    constructor() {
        this.currentPlan = '';
    }

    async initAI() {
        if (!navigator.userActivation?.isActive) {
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

    async generateItinerary(destination, details) {
        if (destination.length > 100) return 'Destination too long (max 100 characters).';
        if (details.length > 1000) return 'Details too long (max 1000 characters).';

        if ('ai' in navigator && navigator.userActivation?.isActive) {
            try {
                const writer = await navigator.ai.writer.create();
                const result = await writer.write(`Create a detailed 3-day travel itinerary for ${destination}.`, details);
                this.currentPlan = result;
                return result;
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
            const result = data.candidates[0].content.parts[0].text;
            this.currentPlan = result;
            return result;
        } catch (error) {
            console.error('Gemini API fallback failed:', error);
            return 'Could not generate itinerary. Check network or API key.';
        }
    }

    // Mock rewrite (as in your original)
    async rewritePlan(instructions) {
        // Since you mentioned rewriter is mocked due to availability
        return `[REWRITTEN BASED ON: "${instructions}"]\n\n${this.currentPlan}`;
    }

    // Mock summarizer (you can implement real AI later)
    async summarizeText(text) {
        return `Summary: ${text.slice(0, 100)}...`;
    }

    // Mock translator (you can implement real AI later)
    async translatePhrase(phrase, language) {
        const mockTranslations = {
            'es': `${phrase} (Spanish translation)`,
            'fr': `${phrase} (French translation)`,
            'de': `${phrase} (German translation)`
        };
        return mockTranslations[language] || phrase;
    }
}
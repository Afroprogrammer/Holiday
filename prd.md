# Product Requirements Document: WanderAI

## 1. Introduction

WanderAI is an AI-powered offline travel planner. It is a Progressive Web App (PWA) that runs entirely on the client-side, using the browser's built-in AI APIs. This allows for offline performance, privacy, and personalization.

## 2. Goal

The goal of WanderAI is to provide travelers with a powerful and reliable tool for planning their trips, even when they don't have an internet connection. It aims to solve common travel pain points like unreliable internet, language barriers, and scattered planning.

## 3. Core Features

*   **Destination Input and Itinerary Generation:** Users can input a destination and receive a tailored itinerary.
*   **Attraction Summaries:** The application provides concise overviews of attractions.
*   **Language Translation:** The application can translate key phrases into the destination's language.
*   **Plan Customization:** Users can rewrite their plans based on their preferences (e.g., budget, interests).
*   **Offline Storage:** Plans are saved to the browser's local storage for offline access.

## 4. Technical Stack

*   **Frontend:** Vanilla HTML, CSS, and JavaScript.
*   **PWA:** The application is a PWA with a `manifest.json` file and a service worker for offline caching.

## 5. AI Integration

The application uses the browser's built-in AI APIs (`window.ai`).

*   **Prompt API:** Used to generate the travel itinerary.
*   **Summarizer API:** Used to summarize attractions.
*   **Translator API:** Used to translate phrases.
*   **Rewriter API:** Currently mocked due to availability issues.

## 6. Future Enhancements

*   **Multimodal Input:** Allow users to input a destination by uploading an image.
*   **Online Sync:** Add an option to sync plans with a cloud service.
*   **Real-time Maps:** Integrate a real-time map service.

# WanderAI - React Edition 🌍✈️

**Your AI-Powered Offline Travel Planner**

WanderAI is a Progressive Web App (PWA) that helps you plan amazing trips using cutting-edge browser-based AI. Plan your adventures even without an internet connection!

## ✨ Features

- 🗺️ **Smart Itinerary Generation** - AI-powered travel plans tailored to your destination
- 🎨 **Plan Customization** - Rewrite your itinerary based on budget, interests, or preferences
- 📝 **Text Summarizer** - Get concise summaries of any travel-related text
- 🌐 **Phrase Translator** - Translate essential phrases into local languages
- 📱 **Offline Ready** - Works without internet using browser AI APIs
- 🔒 **Privacy First** - All processing happens locally in your browser

## 🚀 Quick Start

### Prerequisites
- **Chrome 130+** (required for built-in AI APIs)
- **Node.js 16+** and npm

### Installation

bash
# Clone the repository
git clone <your-repo-url> cd wanderai-react
# Install dependencies
npm install
# Start development server
npm start

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Browser Setup (Important!)

For AI features to work, you need Chrome 130+ with these settings:

1. **Enable Experimental Features:**
    - Go to `chrome://flags`
    - Enable "Experimental Web Platform Features"
    - Restart Chrome

2. **Check AI Availability:**
    - Visit `chrome://components`
    - Look for "Optimization Guide On Device Model" and ensure it's updated

## 🛠️ Technology Stack

- **Frontend:** React 18 + Material-UI
- **AI:** Browser Built-in AI APIs (`navigator.ai`)
- **PWA:** Service Worker + Manifest
- **Styling:** Material-UI (Material Design 3)
- **State Management:** React Hooks

## 🧠 AI Integration

WanderAI leverages Chrome's built-in AI APIs for privacy and offline functionality:

- **Writer API** - Generates detailed travel itineraries
- **Summarizer API** - Creates concise text summaries
- **Translator API** - Translates phrases to local languages
- **Rewriter API** - Customizes plans based on preferences

*Fallback to cloud APIs (Gemini) when local AI is unavailable.*

## 📁 Project Structure
```aiignore
src/
├── components/
│   ├── Header.js              # App header with branding
│   ├── ItineraryGenerator.js  # Main itinerary creation form
│   ├── ItineraryDisplay.js    # Shows generated travel plans
│   ├── PlanCustomizer.js      # Rewrite existing plans
│   ├── TextSummarizer.js      # Summarize any text
│   └── PhraseTranslator.js    # Translate phrases
├── services/
│   └── aiService.js           # AI API integration
├── App.js                     # Main app component
└── index.js                   # App entry point
```

## 🎯 How to Use

1. **Generate Itinerary:**
    - Enter your destination (e.g., "Paris for 3 days")
    - Add optional details (interests, preferences)
    - Click "Generate Itinerary"

2. **Customize Your Plan:**
    - Once you have an itinerary, use the customizer
    - Add instructions like "Make it budget-friendly" or "Focus on food"
    - Click "Rewrite Plan"

3. **Additional Tools:**
    - **Summarizer:** Paste any text to get a concise summary
    - **Translator:** Enter phrases and select target language

## 🚀 Deployment
bash
# Build for production
npm run build
# Deploy to your hosting platform
# (Vercel, Netlify, GitHub Pages, etc.)

## 🔧 Development
bash
# Development server
npm start
# Build for production
npm run build
# Run tests
npm test

## 🌟 Future Enhancements

- 📸 **Multimodal Input** - Upload destination images
- ☁️ **Cloud Sync** - Sync plans across devices  
- 🗺️ **Interactive Maps** - Visual trip planning
- 🏨 **Accommodation Finder** - AI-powered hotel suggestions
- 💰 **Budget Tracker** - Expense planning and tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

**AI features not working?**
- Ensure Chrome 130+ is installed
- Check `chrome://flags` for "Experimental Web Platform Features"
- Verify you're running on `http://localhost:3000` (required for origin trials)

**App not loading?**
- Clear browser cache
- Check console for errors
- Ensure all dependencies are installed (`npm install`)

## 📞 Support

Having issues? [Open an issue](https://github.com/yourusername/wanderai-react/issues) or contact us!

---

**Made with ❤️ for travelers who dream of seamless trip planning**

*WanderAI - Because every journey should start with a great plan!* 🗺️✈️

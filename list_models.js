require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API key");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    try {
        /*
         * Note: The SDK doesn't expose listModels directly on the main instance in some versions?
         * Actually it usually does via a separate ModelManager or similar, but for the simplest node SDK:
         * We actually might not be able to list models easily without using the REST API or specific method.
         * Let's try to just use 'gemini-1.5-flash-latest' which is another common one.
         * Or try a raw fetch to the list models endpoint.
         */

        // Let's try raw fetch for certainty
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Found models:", data.models.length);
            const fs = require('fs');
            fs.writeFileSync('models.json', JSON.stringify(data.models, null, 2));
            console.log("Saved to models.json");
        } else {
            console.log("ERROR LISTING MODELS:", data);
        }

    } catch (error) {
        console.error("List models failed:", error);
    }
}

listModels();

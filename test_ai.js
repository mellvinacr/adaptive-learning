const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    console.log("🔑 Key:", key ? key.substring(0, 8) + "..." : "MISSING");

    if (!key) return;

    try {
        console.log("📡 Fetching models via REST API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.models) {
            console.log("\n✅ AVAILABLE MODELS:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`   - ${m.name.replace("models/", "")}`);
                }
            });
        }
    } catch (e) {
        console.error("❌ List failed:", e.message);
    }
}

listModels();

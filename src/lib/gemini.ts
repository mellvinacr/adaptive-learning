
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables!");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
console.log("Initializing Gemini with key:", apiKey ? "Present" : "Missing");

// Configure with token limits to avoid quota issues
export const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Gunakan 1.5-flash yang lebih stabil untuk Free Tier
    generationConfig: {
        maxOutputTokens: 1000, // 1000 sudah sangat cukup untuk penjelasan materi & kuis
        temperature: 0.7,
        topP: 0.95,
    }
});

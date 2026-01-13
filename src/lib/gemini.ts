
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables!");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
console.log("Initializing Gemini with key:", apiKey ? "Present" : "Missing");

// Configure with token limits to avoid quota issues
export const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        maxOutputTokens: 2000,//alanced: complete response but not excessive
        temperature: 0.7//anced creativity
    }
});

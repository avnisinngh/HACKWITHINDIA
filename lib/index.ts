import { GoogleGenerativeAI } from "@google/generative-ai"

interface ChatRequest {
    prompt : string
}

export async function  askWithGemini(chatRequest : ChatRequest){
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API || '');
    const model = genAI.getGenerativeModel({ model : 'gemini-2.0-flash' })

    const result = await model.generateContent(chatRequest.prompt);
    return result.response.text();
}
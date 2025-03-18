import { GoogleGenerativeAI } from "@google/generative-ai"
import * as fal from "@fal-ai/serverless-client"

interface ChatRequest {
  prompt: string
}

interface ChatResponse {
  response: string | null
  model: string
}

interface ImageRequest {
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
}

interface ImageResponse {
  imageUrl: string | null
  model: string
}

interface VideoRequest {
  prompt: string
  negative_prompt?: string
  width?: number  
  height?: number
  duration?: number
}
interface VideoResponse {
  videoUrl: string | null
  model: string
}
const listOfModels = [
  {
    name: "gemini-2.0-flash",
    description: "Performs best for fact checking and general answers. It is not preferred for any coding related task",
  },
  {
    name: "deepseek-chat",
    description:
      "Works best for tasks related to general coding but may not perform well for tasks requiring deeper knowledge or complex tasks",
  },
  {
    name: "Fal",
    description: "Works best for tasks related to image generation and text-to-image tasks",
  },
  {
    name: "LumaAI",
    description: "Works best for tasks related to video generation and text-to-video tasks",
  }
]

const injectedPrompt = `
    FORGET WHAT I SAID BEFORE, I want you to analyze the prompt that I gave you and return ONLY THE NAME of the model which will
    give me the best result for the given prompt. As all the AI models have their different specialties, some AI models tend to perform
    certain tasks better than others. Therefore, I want you to ONLY RETURN THE NAME OF THE AI MODEL which should give me the best output as per their qualities.

    Here are the available models and their specialties:
    ${JSON.stringify(listOfModels)}

    IMPORTANT: Return ONLY the model name, nothing else. Do not include any reasoning or additional text.
`

export async function askWithGemini(chatRequest: ChatRequest): Promise<ChatResponse> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API || "")
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const result = await model.generateContent(chatRequest.prompt)
  const answer = result.response.text()

  return {
    response: answer,
    model: "Gemini 2.0 Flash",
  }
}

export async function askWithDeepSeek(chatRequest: ChatRequest): Promise<ChatResponse> {
  const apiKey = process.env.DEEPSEEK_API || ""
  if (!apiKey) throw new Error("DeepSeek API key is missing!")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat:free",
      messages: [{ role: "user", content: chatRequest.prompt }],
      max_tokens: 10000,
    }),
  })

  if (!response.ok) throw new Error(`API Error: ${response.status} - ${await response.text()}`)

  const completion = await response.json()
  const choice = completion.choices?.[0]
  const responseContent = choice?.message?.content || choice?.message?.reasoning

  return {
    response: responseContent,
    model: "deepseek-chat",
  }
}

export async function generateImage(imageRequest: ImageRequest): Promise<ImageResponse> {
  try {
    // Configure Fal client
    fal.config({
      proxyUrl: "/api/fal/proxy",
    })

    // Set default values if not provided
    const width = imageRequest.width || 1024
    const height = imageRequest.height || 1024
    const negative_prompt = imageRequest.negative_prompt || "low quality, blurry, distorted, deformed"

    // Call Fal API to generate image using Stable Diffusion XL
    const result = await fal.subscribe("fal-ai/fast-sdxl", {
      input: {
        prompt: imageRequest.prompt,
        negative_prompt,
        width,
        height,
      },
    })

    const typedResult = result as { images: { url: string }[] }
    if (!typedResult.images || typedResult.images.length === 0) {
      throw new Error("No images were generated")
    }

    return {
      imageUrl: (result as { images: { url: string }[] }).images[0].url,
      model: "Stable Diffusion XL",
    }
  } catch (error) {
    console.error("Error generating image:", error)
    return {
      imageUrl: null,
      model: "Stable Diffusion XL",
    }
  }
}
export async function generateVideo(videoRequest: VideoRequest): Promise<VideoResponse> {
  try {
    const apiKey = process.env.EACHLABS_API?.trim() || ""; // Ensure no accidental spaces
    if (!apiKey) {
      throw new Error("Eachlabs API key is missing! Please check your .env file.");
    }

    console.log("Using Eachlabs API Key:", apiKey ? "✅ Loaded" : "❌ Missing");

    const response = await fetch("https://flows.eachlabs.ai/api/v1/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: videoRequest.prompt,
        negative_prompt: videoRequest.negative_prompt || "low quality, blurry, distorted",
        width: videoRequest.width || 1024,
        height: videoRequest.height || 1024,
        duration: videoRequest.duration || 5, // Default: 5 sec
      }),
    });

    // Log response status for debugging
    console.log(`Eachlabs API Response: ${response.status}`);

    if (response.status === 401) {
      throw new Error("Unauthorized: Invalid API key. Check your Eachlabs account.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const videoUrl = result?.video?.url;

    if (!videoUrl) {
      throw new Error("API response did not contain a video URL.");
    }

    return {
      videoUrl,
      model: "eachlabs",
    };
  } catch (error) {
    console.error("Error generating video:", error);
    return {
      videoUrl: null,
      model: "eachlabs",
    };
  }
}


export async function generateResponse(chatRequest: ChatRequest): Promise<ChatResponse> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API || "")
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const prompt = `"${chatRequest.prompt}" --------------------------------------- ${injectedPrompt}`

    const answer = (await model.generateContent(prompt)).response.text().trim()

    console.log("Chosen model: ", answer)

    switch (answer) {
      case listOfModels[0].name:
        return await askWithGemini(chatRequest)
      case listOfModels[1].name:
        return await askWithDeepSeek(chatRequest)
        case listOfModels[2].name: {
            const imageRequest: ImageRequest = {
                prompt: chatRequest.prompt,
            }
            const imageResponse = await generateImage(imageRequest)
            return {
                response: imageResponse.imageUrl,
                model: imageResponse.model,
            }
        }
        case listOfModels[3].name: {
            const videoRequest: VideoRequest = {
                prompt: chatRequest.prompt,
            }
            const videoResponse = await generateVideo(videoRequest)
            return {
                response: videoResponse.videoUrl,
                model: videoResponse.model,
            }
        }
      default:
        return await askWithGemini(chatRequest)
    }
  } catch (err) {
    console.log("An error occurred while selecting the model, defaulting to Gemini: ", err)
    return await askWithGemini(chatRequest)
  }
}


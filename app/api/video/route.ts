import { generateVideo } from "@/lib"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const requestSchema = z.object({
  prompt: z.string(),
  negative_prompt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsedSchema = requestSchema.safeParse(body)

    if (!parsedSchema.success) {
      return NextResponse.json({ message: "Invalid Inputs!!" }, { status: 400 })
    }

    const response = await generateVideo(parsedSchema.data)

    return NextResponse.json({ message: response })
  } catch (err) {
    console.log("Error while generating video: ", err)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}


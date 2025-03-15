import { generateResponse } from '@/lib';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
    prompt : z.string()
});


export async function POST(req : NextRequest){
    try{
        const body = await req.json();
        const parsedSchema = requestSchema.safeParse(body);
       
        if(!parsedSchema.success){
            return NextResponse.json(
                { message : "Invalid Inputs!!" },
                { status : 400 }
            );
        }

        const response = await generateResponse({ prompt : parsedSchema.data.prompt });

        return NextResponse.json({ message : response });

    }catch(err){
        console.log("Error while generating response : " , err);
        return NextResponse.json(
            { message : "Internal server error" },
            { status : 500 }
         )
    }
}
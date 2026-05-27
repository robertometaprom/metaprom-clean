/* eslint-disable @typescript-eslint/no-explicit-any */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {

    const formData = await req.formData();

    const uploadedFile = formData.get("image") as File;

    if (!uploadedFile) {
      return Response.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    const resizedBuffer = Buffer.from(
      await uploadedFile.arrayBuffer()
    );

    const base64Image = resizedBuffer.toString("base64");

    const response = await openai.responses.create({
      model: "gpt-4.1",

      tools: [
        {
          type: "image_generation",
        },
      ],

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Enhance this exact real estate property photo.

Improve:
- lighting
- realism
- sharpness
- luxury feel
- architectural aesthetics
- premium interior design presentation

Keep the SAME room and SAME composition.
Do NOT invent another property.
`,
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`,
              detail: "low",
            },
          ],
        },
      ],
    });

    const imageData = response.output
      ?.filter(
        (item: any) =>
          item.type === "image_generation_call"
      )
      ?.flatMap((item: any) => item.result);

    if (!imageData || !imageData[0]) {
      return Response.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return Response.json({
      image: `data:image/png;base64,${imageData[0]}`,
    });

  } catch (error) {

    console.error(
      "API ERROR FULL:",
      JSON.stringify(error, null, 2)
    );

    return Response.json(
      {
        error: "Enhancement failed",
      },
      {
        status: 500,
      }
    );
  }
}
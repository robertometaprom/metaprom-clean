/* eslint-disable @typescript-eslint/no-explicit-any */

import OpenAI from "openai";
import sharp from "sharp";
import { buildPrompt, Mode } from "../../../lib/prompts";

export const maxDuration = 300;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supportedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

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

    const mimeType = uploadedFile.type;
    if (mimeType && !supportedImageTypes.has(mimeType)) {
      return Response.json(
        {
          error:
            "Unsupported image format. Please upload JPEG, PNG, WEBP, HEIC, or HEIF.",
        },
        { status: 415 }
      );
    }

    const uploadBuffer = Buffer.from(await uploadedFile.arrayBuffer());

    const rawMode = (formData.get("mode") as string | null) ?? "amazon";
    const mode = (rawMode as Mode) ?? "amazon";
    const aiInstructions = (formData.get("aiInstructions") as string) ?? "";

    if (mode === "custom" && aiInstructions.trim().length === 0) {
      return Response.json(
        {
          error: "Custom mode requires AI Instructions.",
        },
        { status: 400 },
      );
    }

    let normalizedBuffer: Buffer;
    try {
      normalizedBuffer = await sharp(uploadBuffer)
        .rotate()
        .toColorspace("srgb")
        .jpeg({ quality: 90, force: true })
        .toBuffer();
    } catch (sharpError) {
      console.error("Image normalization failed:", sharpError);
      return Response.json(
        {
          error:
            "Unable to normalize the uploaded image. Please try a different photo.",
        },
        { status: 415 }
      );
    }

    const base64Image = normalizedBuffer.toString("base64");

    const promptText = buildPrompt(mode, aiInstructions);

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
              text: promptText,
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
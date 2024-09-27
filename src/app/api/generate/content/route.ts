import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/database";
import { prompt, user } from "@/db/schema";
import { CoreMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getCurrentUser } from "@/lib/lucia";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return new Response("Unauthorized", { status: 403 });
    }

    let { prompt: content, price } = await req.json();

    content = content.replace(/\/$/, "").slice(-5000) as string;

    if (currentUser.credits < price) {
      return new Response("Not enough credits to perform this action.", {
        status: 403,
      });
    }

    const messages = [
      {
        role: "system",
        content: `\
You are a professional content writer responsible for writing articles based on provided SEO keywords, article titles, article outlines, and writing tone.
Your main language to write content is English and Vietnamese. Your responses must be in Markdown format.
Here is an example of the content format:

=====================================

# Title of Your Document

## Introduction

Write your introduction here. This section should provide an overview of the topic and set the stage for what the reader can expect in the rest of the document. You might include background information, the purpose of the document, and a brief summary of the main points.

## Outline 1

- Brief description of what this section will cover.
- Key points or subtopics to be discussed.

## Outline 2

- Brief description of what this section will cover.
- Key points or subtopics to be discussed.

## Outline 3

- Brief description of what this section will cover.
- Key points or subtopics to be discussed.

## Conclusion

(Optional) A brief conclusion summarizing the main points covered in the document and any final thoughts or calls to action.

=====================================

Limit your response to no more than 2000 words, but make sure to construct complete sentences.
Write the content using the language that the user uses to give requirement.
        `,
      },
      {
        role: "user",
        content,
      },
    ] as CoreMessage[];

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          credits: sql`${user.credits} - ${price}`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, currentUser.id));
      await tx.insert(prompt).values({
        id: createId(),
        userId: currentUser.id,
        price,
        service: "content",
      });
    });

    const result = await streamText({
      model: openai("gpt-3.5-turbo"),
      messages,
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    });

    // Respond with the stream
    return result.toAIStreamResponse();
  } catch (error: any) {
    console.error("Error occurred:", error);
    return new Response(`Something went wrong: ${error.message}`, {
      status: 500,
    });
  }
}

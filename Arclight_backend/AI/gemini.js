import { GoogleGenerativeAI } from "@google/generative-ai";

// ----------------------------
// CONFIG
// ----------------------------
const SUPPORTED_FEATURES = {
    object_removal: {
        requires_mask: true,
        description: "Remove unwanted objects using user brush + LaMa inpainting.",
    },
    background_removal: {
        requires_mask: false,
        description: "Accurate background removal using SAM + matting.",
    },
    relighting: {
        requires_mask: false,
        description: "Adjust lighting using depth-based relighting pipeline.",
    },
    auto_enhance: {
        requires_mask: false,
        description: "Automatic enhancement: brightness, sharpness, color, face restoration.",
    },
    style_transfer: {
        requires_mask: false,
        description: "Apply LUT-based style transformation.",
    },
    text_editing: {
        requires_mask: true,
        description: "Replace scene text while preserving style and texture.",
    },
};

const API_SYSTEM_PROMPT = `
You are an AI editing assistant used INSIDE a production image editor.
You NEVER invent new features.

You must follow these rules:
1. Only use the supported feature list the user provides.
2. If the user asks for something unsupported, politely say it is not available
   and show the list of supported features.
3. For each feature, output structured JSON with:
   - feature
   - requires_mask
   - message (instructions to user)
   - supported (true/false)
4. If user provides only an image, provide 3–5 editing suggestions but ONLY from supported features.
`;

// ----------------------------------------
// INIT MODEL
// ----------------------------------------
function configureGemini(apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// ----------------------------------------
// IMAGE-ONLY → SUGGEST EDITS
// ----------------------------------------
async function suggestEdits(model, imageBytes) {
    const prompt = `
Analyze the image and propose 3–5 editing improvements.
Only choose from these supported features:
object removal, background removal, relighting, auto enhance, style transfer, text editing.

Return ONLY a list of suggestions in plain text.
`;

    const result = await model.generateContent({
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageBytes.toString("base64"),
                        },
                    },
                ],
            },
        ],
    });

    return {
        mode: "suggestions",
        suggestions: result.response.text().split("\n"),
    };
}

// ----------------------------------------
// TEXT-ONLY → INTENT CLASSIFICATION
// ----------------------------------------
async function analyzeUserPrompt(model, userText) {
    const featureList = Object.keys(SUPPORTED_FEATURES).join(", ");

    const prompt = `
User said: "${userText}"

Your job: map the user intent to EXACTLY ONE of these supported features:
${featureList}

If it does not match any, return "not_supported".

Return JSON ONLY in format:
{
  "feature": "...",
  "requires_mask": true/false,
  "message": "Instruction for user",
  "supported": true/false
}
`;

    const result = await model.generateContent(prompt);
    return result.response.text(); // JSON string
}

// ----------------------------------------
// ROUTER (equivalent to Python route())
// ----------------------------------------
async function route(apiKey, { imageBytes = null, userText = null } = {}) {
    const model = configureGemini(apiKey);

    if (imageBytes && !userText) {
        return await suggestEdits(model, imageBytes);
    }

    if (userText) {
        return await analyzeUserPrompt(model, userText);
    }

    return { status: "error", message: "No input provided." };
}

// ----------------------------------------
// EXPORTS
// ----------------------------------------
export {
    route,
    configureGemini,
    analyzeUserPrompt,
    suggestEdits,
    SUPPORTED_FEATURES,
};


// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Add type reference for Deno
/// <reference lib="deno.ns" />

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
    type: 'user' | 'ai';
    text: string;
}

interface RequestBody {
    dreamText: string;
    interpreter?: string;
    profile?: any;
    history?: ChatMessage[];
    isChatMode?: boolean;
    tag?: string;
    mood?: string;
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { dreamText, interpreter, profile, history, isChatMode, tag, mood } = await req.json() as RequestBody
        const apiKey = Deno.env.get('GEMINI_API_KEY')

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set')
        }

        // --- 1. Define Persona ---
        let systemRole = "Act as a wise, master dream interpreter who combines psychology and spirituality.";
        if (interpreter === 'Sigmund Freud') systemRole = "Act as Sigmund Freud. Use psychoanalysis, focus on repressed desires, childhood, and sexuality. Be analytical and authoritative.";
        if (interpreter === 'Carl Jung') systemRole = "Act as Carl Jung. Focus on archetypes, the collective unconscious, and individuation. Be philosophical and deep.";
        if (interpreter === 'İbn-i Şirin') systemRole = "Act as Ibn-i Sirin. Interpret based on Islamic tradition and spiritual symbols. Be wise, religious, and respectful.";
        if (interpreter === 'Baba Vanga') systemRole = "Act as Baba Vanga. Be mystical, predictive, and slightly cryptic. Focus on future warnings.";
        if (interpreter === 'Nostradamus') systemRole = "Act as Nostradamus. Write in a slightly poetic, prophetic riddle style, then explain it.";

        // --- 2. Prepare Profile Context ---
        let profileContext = "User Profile: Anonymous";
        if (profile) {
            const age = profile.birth_date ? (new Date().getFullYear() - new Date(profile.birth_date).getFullYear()) : '?';
            profileContext = `
User Profile (for context only):
- Age: ${age}
- Gender: ${profile.gender || '?'}
- Job: ${profile.job || '?'}
- Marital Status: ${profile.marital_status || '?'}
- Zodiac: ${profile.zodiac_sign || '?'}
        `.trim();
        }

        // --- 3. Construct System Instruction ---
        let systemInstruction = "";

        if (!isChatMode) {
            // INITIAL ANALYSIS MODE
            systemInstruction = `
${systemRole}

${profileContext}

CRITICAL RULES FOR INTERPRETATION:

1. **ADAPTIVE VOCABULARY**:
   - **Analyze the User's Job**: 
     - If the user has an academic/white-collar job, you may use some psychological terminology.
     - **DEFAULT**: If the job is manual, general, student, or unknown, you MUST **SIMPLIFY** your language. 
       - *Forbidden*: "Kolektif bilinçdışı", "Anima/Animus", "Metaforik imge".
       - *Allowed*: "İç dünyan", "Ruhunun derinlikleri", "Sembol".
       - Speak plainly, like a wise friend.

2. **Holistic Synthesis**: 
   - Weave user details into the story only if relevant.

3. **Language Rule**: 
   - Respond in the **SAME LANGUAGE** as the user's "Dream Text".

4. **Format**: 
   - No headers. No "Introduction".
   - Direct, flowing, warm, and mystical narrative.

5. **ENGAGEMENT HOOK**:
   - You MUST end with a **Subtle Mystery** or **Cliffhanger**.
   - Example rule: "...there is one specific detail about the [dream_object] that suggests a secret from your past, but I am not sure if I should reveal it yet..."

6. **SAFETY GUARDRAILS**:
   - If suicide/self-harm/death themes:
     - NEVER frame harmful acts as peaceful.
     - MUST append: "Note: Dreams are symbolic. If you feel overwhelmed, please seek professional support." (Translate this).
        `.trim();
        } else {
            // CONVERSATIONAL CHAT MODE
            systemInstruction = `
${systemRole}

${profileContext}

You have already interpreted the user's dream. Now you are in a CONVERSATIONAL MODE.

RULES FOR CHAT:
1. **Direct & Concise**: Answer directly. No long monologues.
2. **Context**: Focus on the user's current query.
3. **Tone**: Keep the persona (${interpreter}) but be interactive.
4. **Length Control**: If asked to be short, BE BRIEF.
5. **No Repetition**: Do NOT re-interpret the whole dream.
6. **Safety**: Adhere to safety guardrails.
7. **Language**: Respond in the same language as the user's message.
        `.trim();
        }

        // --- 4. Construct API Request Payload ---
        let apiContents: any[] = [];

        if (!isChatMode) {
            // For initial analysis, we construct a single user message
            const initialUserMessage = `
Dream Text: "${dreamText}"
Theme: ${tag || 'General'}
Main Emotion: ${mood || 'Neutral'}

Interpret this dream now.
        `.trim();

            apiContents = [{
                role: 'user',
                parts: [{ text: initialUserMessage }]
            }];
        } else {
            // For chat mode, we use the provided history

            const initialUserMessage = `
Dream Text: "${dreamText}"
Theme: ${tag || 'General'}
Main Emotion: ${mood || 'Neutral'}

Interpret this dream now.
        `.trim();

            apiContents = [];

            if (Array.isArray(history)) {
                apiContents = history.map((msg, index) => {
                    // For the first user message (dream text), acts as the root context
                    if (index === 0 && msg.type === 'user') {
                        return {
                            role: 'user',
                            parts: [{ text: initialUserMessage }]
                        };
                    }
                    return {
                        role: msg.type === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }]
                    };
                });
            }
        }

        // --- 5. Call Gemini API ---
        const models = ['gemini-2.0-flash-001', 'gemini-1.5-flash'];
        let aiResponseText = '';

        for (const model of models) {
            try {
                const url = `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: systemInstruction }] },
                        contents: apiContents
                    })
                });

                const data = await response.json();

                if (data.error) {
                    console.error(`Model ${model} error:`, data.error);
                    continue; // Try next model
                }

                aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (aiResponseText) break; // Success

            } catch (e) {
                console.error(`Net error on ${model}:`, e);
            }
        }

        if (!aiResponseText) {
            throw new Error('Failed to get response from AI models');
        }

        return new Response(
            JSON.stringify({ text: aiResponseText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

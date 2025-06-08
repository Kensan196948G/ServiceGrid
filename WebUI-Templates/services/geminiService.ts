import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_TEXT_MODEL, GEMINI_API_KEY_ENV_VAR } from "../constants";

// IMPORTANT: API Key Management
// The API key MUST be provided through the `process.env.API_KEY` environment variable.
// This frontend simulation cannot directly access `process.env` in a typical browser deployment.
// For development, you might set this in your .env file and use a bundler (like Vite/Webpack)
// to make it available. If `process.env.API_KEY` is undefined, the API call will fail.
// This service assumes `process.env.API_KEY` is properly configured in the environment
// where this code is built/run.
// For the purpose of this exercise, we will try to access it, and if it's not available,
// the API call will error out, which is the expected behavior.

const getApiKey = (): string | undefined => {
  // In a real Vite/Create React App setup, environment variables prefixed with
  // REACT_APP_ or VITE_ are embedded at build time.
  // For this specific structure, we'll assume `process.env.API_KEY` might be substituted.
  // If not, this will be undefined.
  // To make this work in a local dev environment without a complex build process for this specific structure:
  // 1. You could manually replace `process.env.API_KEY` with your actual key string here (NOT RECOMMENDED FOR PRODUCTION).
  // 2. Or, ensure your development server/environment correctly sets this.
  // For this exercise, we rely on the user's environment to provide it.
  // If you are running this code directly in a browser sandbox that doesn't have process.env,
  // then this will be undefined.
  try {
    // This is a placeholder. In a Node.js environment, this works.
    // In a browser, `process` is not defined unless polyfilled or provided by a build tool.
    // The prompt states "Assume this variable is pre-configured".
    // So we use it directly.
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        // @ts-ignore
        return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("process.env.API_KEY not accessible in this environment. Gemini API calls will likely fail if a key is not hardcoded or otherwise provided.");
  }
  
  // Fallback if process.env.API_KEY is not found.
  // THIS IS A VERY INSECURE FALLBACK FOR LOCAL TESTING ONLY if the above fails.
  // DO NOT COMMIT YOUR API KEY.
  // const LOCAL_TEST_API_KEY = "YOUR_GEMINI_API_KEY_HERE_FOR_LOCAL_TESTING_ONLY"; 
  // if (LOCAL_TEST_API_KEY !== "YOUR_GEMINI_API_KEY_HERE_FOR_LOCAL_TESTING_ONLY") {
  //   console.warn("Using local test API key. DO NOT DEPLOY THIS.");
  //   return LOCAL_TEST_API_KEY;
  // }
  
  console.error(`APIキーが見つかりません。${GEMINI_API_KEY_ENV_VAR} が設定されていることを確認してください。`);
  return undefined;
};

let ai: GoogleGenAI | null = null;

const initializeAi = () => {
  if (ai) return;
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Gemini APIキーがありません。サービスを初期化できません。");
    throw new Error("Gemini APIキーがありません。process.env.API_KEY を設定してください。");
  }
  ai = new GoogleGenAI({ apiKey });
};


export const askGemini = async (prompt: string, systemInstruction?: string): Promise<string> => {
  initializeAi(); // Ensure AI is initialized
  if (!ai) {
    return "Gemini AIサービスが初期化されていません。APIキーが不足している可能性があります。";
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      ...(systemInstruction && { config: { systemInstruction } }),
      // Example of other configs if needed:
      // config: {
      //   temperature: 0.7,
      //   topK: 50,
      //   topP: 0.9,
      //   systemInstruction: systemInstruction || "あなたは役立つITサポートアシスタントです。",
      //   // thinkingConfig: { thinkingBudget: 0 } // Disable thinking for low latency if required
      // }
    });
    
    // Directly access the text property as per guidelines
    const textResponse = response.text;
    
    if (typeof textResponse === 'string') {
        return textResponse;
    } else {
        // This case should ideally not happen if the API returns correctly based on text prompt
        console.error("Geminiからの予期しない応答形式:", response);
        return "AIから予期しない形式の応答を受け取りました。";
    }

  } catch (error: any) {
    console.error("Gemini API呼び出しエラー:", error);
    if (error.message && error.message.includes('API key not valid')) {
        return "エラー: 提供されたGemini APIキーは無効です。APIキーを確認して再試行してください。";
    }
    if (error.message && error.message.includes('fetch')) { // Generic network error
        return "エラー: Gemini APIに接続できませんでした。ネットワーク接続を確認してください。";
    }
    return `AIとの対話エラー: ${error.message || '不明なエラーが発生しました'}`;
  }
};

// Example of asking for JSON (not used in current KnowledgePage, but for reference)
export const askGeminiForJson = async <T,>(prompt: string, systemInstruction?: string): Promise<T | string> => {
  initializeAi();
  if (!ai) {
    return "Gemini AIサービスが初期化されていません。APIキーが不足している可能性があります。";
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        ...(systemInstruction && { systemInstruction }),
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; // Handles ```json ... ```
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr) as T;
      return parsedData;
    } catch (e) {
      console.error("GeminiからのJSON応答の解析に失敗しました:", e, "生の応答:", jsonStr);
      return "エラー: AIが無効なJSONを返しました。 Raw: " + jsonStr.substring(0, 100) + "...";
    }
  } catch (error: any) {
    console.error("JSON取得のためのGemini API呼び出しエラー:", error);
     if (error.message && error.message.includes('API key not valid')) {
        return "エラー: 提供されたGemini APIキーは無効です。APIキーを確認して再試行してください。";
    }
    return `JSON取得のためのAIとの対話エラー: ${error.message || '不明なエラーが発生しました'}`;
  }
};
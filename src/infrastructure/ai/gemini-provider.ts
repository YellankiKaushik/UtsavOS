import "server-only";
import { GoogleGenAI } from "@google/genai";
import { aiConfig } from "../config";
import { ProviderError, classifyFailure, type ModelTransport } from "./types";
export const geminiTransport: ModelTransport = async (request) => {
  const key = aiConfig().keys.gemini;
  if (!key) throw new ProviderError("gemini", "authentication");
  try {
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: request.timeout, retryOptions: { attempts: 1 } },
    });
    const response = await client.models.generateContent({
      model: request.model,
      contents: JSON.stringify(request.context),
      config: {
        systemInstruction: request.system,
        responseMimeType: "application/json",
        responseJsonSchema: request.schema,
        maxOutputTokens: 8192,
        abortSignal: request.signal,
        httpOptions: {
          timeout: request.timeout,
          retryOptions: { attempts: 1 },
        },
      },
    });
    if (
      response.promptFeedback?.blockReason ||
      response.candidates?.[0]?.finishReason === "SAFETY"
    )
      throw new ProviderError("gemini", "refusal");
    if (response.candidates?.[0]?.finishReason !== "STOP")
      throw new ProviderError("gemini", "invalid_output");
    return {
      text: response.text ?? "",
      actualModel: response.modelVersion ?? request.model,
      providerRequestId: response.responseId,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };
  } catch (error) {
    throw classifyFailure(error, "gemini", request.signal);
  }
};

import "dotenv/config.js";
import { CarnorAgent } from "Carnor-agent-framework/agents/Carnor/agent";
import { ChatLLM, ChatLLMOutput } from "Carnor-agent-framework/llms/chat";
import { getEnv, parseEnv } from "Carnor-agent-framework/internals/env";
import { FrameworkError } from "Carnor-agent-framework/errors";
import { TokenMemory } from "Carnor-agent-framework/memory/tokenMemory";
import { WatsonXChatLLM } from "Carnor-agent-framework/adapters/watsonx/chat";
import { OpenAIChatLLM } from "Carnor-agent-framework/adapters/openai/chat";
import { OllamaChatLLM } from "Carnor-agent-framework/adapters/ollama/chat";
import { IBMVllmChatLLM } from "Carnor-agent-framework/adapters/ibm-vllm/chat";
import { IBMVllmModel } from "Carnor-agent-framework/adapters/ibm-vllm/chatPreset";
import { OpenMeteoTool } from "Carnor-agent-framework/tools/weather/openMeteo";
import { DuckDuckGoSearchTool } from "Carnor-agent-framework/tools/search/duckDuckGoSearch";
import { Ollama } from "ollama";
import OpenAI from "openai";
import { z } from "zod";
import * as process from "node:process";
import { createConsoleReader } from "examples/helpers/io.js";

const Providers = {
  WATSONX: "watsonx",
  OLLAMA: "ollama",
  IBMVLLM: "ibmvllm",
  IBMRITS: "ibmrits",
} as const;
type Provider = (typeof Providers)[keyof typeof Providers];

function getChatLLM(provider?: Provider): ChatLLM<ChatLLMOutput> {
  const LLMFactories: Record<Provider, () => ChatLLM<ChatLLMOutput>> = {
    [Providers.OLLAMA]: () =>
      new OllamaChatLLM({
        modelId: getEnv("OLLAMA_MODEL") || "granite3.1-dense:8b",
        parameters: {
          temperature: 0,
          repeat_penalty: 1,
          num_predict: 2000,
        },
        client: new Ollama({
          host: getEnv("OLLAMA_HOST"),
        }),
      }),
    [Providers.WATSONX]: () =>
      WatsonXChatLLM.fromPreset(getEnv("WATSONX_MODEL") || "ibm/granite-3-8b-instruct", {
        apiKey: getEnv("WATSONX_API_KEY"),
        projectId: getEnv("WATSONX_PROJECT_ID"),
        region: getEnv("WATSONX_REGION"),
      }),
    [Providers.IBMVLLM]: () => IBMVllmChatLLM.fromPreset(IBMVllmModel.GRANITE_3_1_8B_INSTRUCT),
    [Providers.IBMRITS]: () =>
      new OpenAIChatLLM({
        client: new OpenAI({
          baseURL: process.env.IBM_RITS_URL,
          apiKey: process.env.IBM_RITS_API_KEY,
          defaultHeaders: {
            RITS_API_KEY: process.env.IBM_RITS_API_KEY,
          },
        }),
        modelId: getEnv("IBM_RITS_MODEL") || "ibm-granite/granite-3.1-8b-instruct",
        parameters: {
          temperature: 0,
          max_tokens: 2048,
        },
      }),
  };

  if (!provider) {
    provider = parseEnv("LLM_BACKEND", z.nativeEnum(Providers), Providers.OLLAMA);
  }

  const factory = LLMFactories[provider];
  if (!factory) {
    throw new Error(`Provider "${provider}" not found.`);
  }
  return factory();
}

const llm = getChatLLM();
const agent = new CarnorAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new OpenMeteoTool(), new DuckDuckGoSearchTool({ maxResults: 3 })],
});

const reader = createConsoleReader();

try {
  const prompt = await reader.prompt();
  const response = await agent
    .run(
      { prompt },
      {
        execution: {
          maxIterations: 8,
          maxRetriesPerStep: 3,
          totalMaxRetries: 3,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("update", (data) => {
        reader.write(`Agent (${data.update.key}) 🤖 : `, data.update.value.trim());
      });
    });
  reader.write(`Agent 🤖: `, response.result.text);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}

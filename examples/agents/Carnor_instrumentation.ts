////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// RUN THIS EXAMPLE VIA `yarn start:telemetry ./examples/agents/Carnor_instrumentation.ts` ///////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

import { CarnorAgent } from "Carnor-agent-framework/agents/Carnor/agent";
import { FrameworkError } from "Carnor-agent-framework/errors";
import { TokenMemory } from "Carnor-agent-framework/memory/tokenMemory";
import { Logger } from "Carnor-agent-framework/logger/logger";
import { DuckDuckGoSearchTool } from "Carnor-agent-framework/tools/search/duckDuckGoSearch";
import { WikipediaTool } from "Carnor-agent-framework/tools/search/wikipedia";
import { OpenMeteoTool } from "Carnor-agent-framework/tools/weather/openMeteo";
import { OllamaChatLLM } from "Carnor-agent-framework/adapters/ollama/chat";

Logger.root.level = "silent"; // disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

const llm = new OllamaChatLLM({
  modelId: "llama3.1", // llama3.1:70b for better performance
});

const agent = new CarnorAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [
    new DuckDuckGoSearchTool(),
    new WikipediaTool(),
    new OpenMeteoTool(), // weather tool
  ],
});

try {
  const response = await agent.run(
    { prompt: "what is the weather like in Granada?" },
    {
      execution: {
        maxRetriesPerStep: 3,
        totalMaxRetries: 10,
        maxIterations: 20,
      },
    },
  );

  logger.info(`Agent 🤖 : ${response.result.text}`);
} catch (error) {
  logger.error(FrameworkError.ensure(error).dump());
}

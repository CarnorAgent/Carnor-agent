import "dotenv/config.js";
import { CarnorAgent } from "Carnor-agent-framework/agents/Carnor/agent";
import { TokenMemory } from "Carnor-agent-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "Carnor-agent-framework/tools/search/duckDuckGoSearch";
import { OllamaChatLLM } from "Carnor-agent-framework/adapters/ollama/chat";
import { OpenMeteoTool } from "Carnor-agent-framework/tools/weather/openMeteo";

const llm = new OllamaChatLLM();
const agent = new CarnorAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new DuckDuckGoSearchTool(), new OpenMeteoTool()],
});

const response = await agent
  .run({ prompt: "What's the current weather in Las Vegas?" })
  .observe((emitter) => {
    emitter.on("update", async ({ data, update, meta }) => {
      console.log(`Agent (${update.key}) 🤖 : `, update.value);
    });
  });

console.log(`Agent 🤖 : `, response.result.text);

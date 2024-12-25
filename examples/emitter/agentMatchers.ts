import { CarnorAgent } from "Carnor-agent-framework/agents/Carnor/agent";
import { UnconstrainedMemory } from "Carnor-agent-framework/memory/unconstrainedMemory";
import { OllamaChatLLM } from "Carnor-agent-framework/adapters/ollama/chat";

const agent = new CarnorAgent({
  llm: new OllamaChatLLM(),
  memory: new UnconstrainedMemory(),
  tools: [],
});

// Matching events on the instance level
agent.emitter.match("*.*", (data, event) => {});

await agent
  .run({
    prompt: "Hello agent!",
  })
  .observe((emitter) => {
    // Matching events on the execution (run) level
    emitter.match("*.*", (data, event) => {
      console.info(`RUN LOG: received event '${event.path}'`);
    });
  });

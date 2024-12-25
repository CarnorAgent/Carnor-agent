import "dotenv/config.js";
import { CarnorAgent } from "Carnor-agent-framework/agents/Carnor/agent";
import { UnconstrainedMemory } from "Carnor-agent-framework/memory/unconstrainedMemory";
import { OpenAIChatLLM } from "Carnor-agent-framework/adapters/openai/chat";
import { WikipediaTool } from "Carnor-agent-framework/tools/search/wikipedia";

// We create an agent
let agent = new CarnorAgent({
  llm: new OpenAIChatLLM(),
  tools: [new WikipediaTool()],
  memory: new UnconstrainedMemory(),
});

// We ask the agent
let prompt = "Who is the president of USA?";
console.info(prompt);
const response = await agent.run({
  prompt,
});
console.info(response.result.text);

// We can save (serialize) the agent
const json = agent.serialize();

// We reinitialize the agent to the exact state he was
agent = CarnorAgent.fromSerialized(json);

// We continue in our conversation
prompt = "When was he born?";
console.info(prompt);
const response2 = await agent.run({
  prompt,
});
console.info(response2.result.text);

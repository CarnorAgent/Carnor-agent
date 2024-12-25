import "dotenv/config.js";
import { CarnorAgent } from "Carnor-agent-framework/agents/Carnor/agent";
import { GroqChatLLM } from "Carnor-agent-framework/adapters/groq/chat";
import { SQLTool } from "Carnor-agent-framework/tools/database/sql";
import { FrameworkError } from "Carnor-agent-framework/errors";
import { UnconstrainedMemory } from "Carnor-agent-framework/memory/unconstrainedMemory";
import fs from "node:fs";
import * as path from "node:path";
import os from "node:os";

const llm = new GroqChatLLM({
  modelId: "llama-3.1-70b-versatile",
  parameters: {
    temperature: 0,
  },
});

const sqlTool = new SQLTool({
  provider: "sqlite",
  connection: {
    dialect: "sqlite",
    logging: false,
    storage: await fetch(
      "https://github.com/lerocha/chinook-database/releases/download/v1.4.5/chinook_sqlite.sqlite",
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to download Chinook database!");
      }

      const dbPath = path.join(os.tmpdir(), "Carnor_chinook.sqlite");
      const data = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(dbPath, data);
      return dbPath;
    }),
  },
});

const agent = new CarnorAgent({
  llm,
  memory: new UnconstrainedMemory(),
  tools: [sqlTool],
});

const question = "which country's customers spent the most?";

try {
  const response = await agent
    .run(
      { prompt: `From the database: ${question}` },
      {
        execution: {
          maxRetriesPerStep: 5,
          totalMaxRetries: 10,
          maxIterations: 15,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("error", ({ error }) => {
        console.log(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
      });
      emitter.on("retry", () => {
        console.log(`Agent 🤖 : `, "retrying the action...");
      });
      emitter.on("update", async ({ data, update, meta }) => {
        console.log(`Agent (${update.key}) 🤖 : `, update.value);
      });
    });

  console.log(`Agent 🤖 : `, response.result.text);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  await sqlTool.destroy();
}

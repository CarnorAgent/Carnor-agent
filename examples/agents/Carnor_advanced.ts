import "dotenv/config.js";
import { CarnorAgent } from "Carnor-agent-framework/agents/Carnor/agent";
import { createConsoleReader } from "../helpers/io.js";
import { FrameworkError } from "Carnor-agent-framework/errors";
import { Logger } from "Carnor-agent-framework/logger/logger";
import {
  DuckDuckGoSearchTool,
  DuckDuckGoSearchToolSearchType,
} from "Carnor-agent-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "Carnor-agent-framework/tools/weather/openMeteo";
import {
  CarnorAssistantPrompt,
  CarnorSchemaErrorPrompt,
  CarnorSystemPrompt,
  CarnorToolErrorPrompt,
  CarnorToolInputErrorPrompt,
  CarnorToolNoResultsPrompt,
  CarnorUserEmptyPrompt,
} from "Carnor-agent-framework/agents/Carnor/prompts";
import { PromptTemplate } from "Carnor-agent-framework/template";
import { BAMChatLLM } from "Carnor-agent-framework/adapters/bam/chat";
import { UnconstrainedMemory } from "Carnor-agent-framework/memory/unconstrainedMemory";
import { z } from "zod";

Logger.root.level = "silent"; // disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

const llm = BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");

const agent = new CarnorAgent({
  llm,
  memory: new UnconstrainedMemory(),
  // You can override internal templates
  templates: {
    user: new PromptTemplate({
      schema: z
        .object({
          input: z.string(),
        })
        .passthrough(),
      template: `User: {{input}}`,
    }),
    system: CarnorSystemPrompt.fork((old) => ({
      ...old,
      defaults: {
        instructions: "You are a helpful assistant that uses tools to answer questions.",
      },
    })),
    toolError: CarnorToolErrorPrompt,
    toolInputError: CarnorToolInputErrorPrompt,
    toolNoResultError: CarnorToolNoResultsPrompt.fork((old) => ({
      ...old,
      template: `${old.template}\nPlease reformat your input.`,
    })),
    toolNotFoundError: new PromptTemplate({
      schema: z
        .object({
          tools: z.array(z.object({ name: z.string() }).passthrough()),
        })
        .passthrough(),
      template: `Tool does not exist!
{{#tools.length}}
Use one of the following tools: {{#trim}}{{#tools}}{{name}},{{/tools}}{{/trim}}
{{/tools.length}}`,
    }),
    schemaError: CarnorSchemaErrorPrompt,
    assistant: CarnorAssistantPrompt,
    userEmpty: CarnorUserEmptyPrompt,
  },
  tools: [
    new DuckDuckGoSearchTool({
      maxResults: 10,
      search: {
        safeSearch: DuckDuckGoSearchToolSearchType.STRICT,
      },
    }),
    // new WebCrawlerTool(), // HTML web page crawler
    // new WikipediaTool(),
    new OpenMeteoTool(), // weather tool
    // new ArXivTool(), // research papers
    // new DynamicTool() // custom python tool
  ],
});

const reader = createConsoleReader();

try {
  for await (const { prompt } of reader) {
    const response = await agent
      .run(
        { prompt },
        {
          execution: {
            maxRetriesPerStep: 3,
            totalMaxRetries: 10,
            maxIterations: 20,
          },
          signal: AbortSignal.timeout(2 * 60 * 1000),
        },
      )
      .observe((emitter) => {
        emitter.on("start", () => {
          reader.write(`Agent 🤖 : `, "starting new iteration");
        });
        emitter.on("error", ({ error }) => {
          reader.write(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
        });
        emitter.on("retry", () => {
          reader.write(`Agent 🤖 : `, "retrying the action...");
        });
        emitter.on("update", async ({ data, update, meta }) => {
          // log 'data' to see the whole state
          // to log only valid runs (no errors), check if meta.success === true
          reader.write(`Agent (${update.key}) 🤖 : `, update.value);
        });
        emitter.on("partialUpdate", ({ data, update, meta }) => {
          // ideal for streaming (line by line)
          // log 'data' to see the whole state
          // to log only valid runs (no errors), check if meta.success === true
          // reader.write(`Agent (partial ${update.key}) 🤖 : `, update.value);
        });

        // To observe all events (uncomment following block)
        // emitter.match("*.*", async (data: unknown, event) => {
        //   logger.trace(event, `Received event "${event.path}"`);
        // });
      });

    reader.write(`Agent 🤖 : `, response.result.text);
  }
} catch (error) {
  logger.error(FrameworkError.ensure(error).dump());
} finally {
  reader.close();
}

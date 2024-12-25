import { FileCache } from "Carnor-agent-framework/cache/fileCache";
import { UnconstrainedCache } from "Carnor-agent-framework/cache/unconstrainedCache";
import os from "node:os";

const memoryCache = new UnconstrainedCache<number>();
await memoryCache.set("a", 1);

const fileCache = await FileCache.fromProvider(memoryCache, {
  fullPath: `${os.tmpdir()}/Carnor_file_cache.json`,
});
console.log(`Saving cache to "${fileCache.source}"`);
console.log(await fileCache.get("a")); // 1

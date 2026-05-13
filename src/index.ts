import { Hono } from "hono";
import { serve } from "@hono/node-server";
import "dotenv/config";

import { runAgent } from "./agent";

const app = new Hono();

app.post("/run-agent", async (c) => {
  const { message } = await c.req.json<{ message: string }>();
  if (!message) {
    return c.json({ error: "Message is required" }, 400);
  }

  try {
    const ressult = await runAgent(message);
    return c.json({ result: ressult });
  } catch (error) {
    return c.json({ error: "Failed to run agent" }, 500);
  }
});

// 这里才是真正监听的地方
serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
  },
  (info) => {
    console.log(`Server running at http://localhost:${info.port}`);
  },
);

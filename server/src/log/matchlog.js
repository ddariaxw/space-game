// server/src/log/matchlog.js
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

export class JsonLinesTransform extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
  }

  _transform(chunk, encoding, callback) {
    try {
      const line = JSON.stringify({ t: Date.now(), ...chunk }) + "\n";
      callback(null, line);
    } catch (err) {
      callback(err);
    }
  }
}

export async function createMatchLogStream(roomId, sourceReadableStream) {
  if (!fs.existsSync(config.LOG_DIR)) {
    fs.mkdirSync(config.LOG_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const logFilePath = path.join(config.LOG_DIR, `${roomId}-${timestamp}.ndjson`);

  const writeStream = fs.createWriteStream(logFilePath, { encoding: "utf8" });
  const jsonLinesTransform = new JsonLinesTransform();

  try {
    await pipeline(sourceReadableStream, jsonLinesTransform, writeStream);
    console.log(`Match log successfully saved to ${logFilePath}`);
  } catch (err) {
    console.error("Match logging pipeline failed:", err);
  }
}
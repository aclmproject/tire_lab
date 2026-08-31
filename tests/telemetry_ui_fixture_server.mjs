import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.ACLM_UI_FIXTURE_PORT || 48767);
const appRoot = normalize(join(import.meta.dirname, "..", "src", "payload", "app"));
const sample = [
  "timestamp_utc,core_temp_c_fl,core_temp_c_fr,core_temp_c_rl,core_temp_c_rr,speed_kmh,lap,distance_traveled_m",
  "2026-08-28T20:00:00Z,65,66,62,63,120,1,100",
  "2026-08-28T20:00:00.1Z,67,68,64,65,125,1,104",
  "2026-08-28T20:00:00.2Z,69,70,66,67,130,1,108",
].join("\n") + "\n";
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
let lastStartManifest = null;
async function requestText(request){const chunks=[];for await(const chunk of request)chunks.push(chunk);return Buffer.concat(chunks).toString("utf8");}

http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/telemetry-latest")) {
      response.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" });
      response.end(sample);
      return;
    }
    if (request.url.startsWith("/api/telemetry-status")) {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ state: "stopped", message: "Fixture logger is stopped.", samples: 3, rate_hz: 10, file: "fixture.csv" }));
      return;
    }
    if (request.url.startsWith("/api/telemetry-start") && request.method === "POST") {
      const body=JSON.parse(await requestText(request)||"{}");lastStartManifest=body.manifest||null;
      response.writeHead(lastStartManifest?.appVersion==="0.10.2"?200:400,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
      response.end(JSON.stringify(lastStartManifest?{state:"waiting",message:"Fixture accepted generated manifest.",samples:0,rate_hz:body.rate_hz,manifest_received:true}:{error:"manifest missing"}));return;
    }
    if (request.url.startsWith("/api/telemetry-fixture-manifest")) {
      response.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});response.end(JSON.stringify(lastStartManifest));return;
    }
    const pathname = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const target = normalize(join(appRoot, relative));
    if (!target.startsWith(appRoot)) throw new Error("Invalid path");
    const data = await readFile(target);
    response.writeHead(200, { "Content-Type": mime[extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => process.stdout.write(`fixture ready on ${port}\n`));

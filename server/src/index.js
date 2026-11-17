import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { validateMessage } from "./protocol.js";
import { RoomManager } from "./rooms.js";

const roomManager = new RoomManager();
const CLIENT_DIST = path.resolve(process.cwd());

const MIME_TYPES = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json",
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
        return;
    }

    if (url.pathname === "/api/rooms" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(roomManager.getRoomsList()));
        return;
    }

    let filePath = path.join(CLIENT_DIST, url.pathname === "/" ? "index.html" : url.pathname);
    if (!filePath.startsWith(CLIENT_DIST)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden");
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            filePath = path.join(CLIENT_DIST, "index.html");
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("Internal Server Error");
                return;
            }
            const ext = path.extname(filePath);
            res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
            res.end(data);
        });
    });
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
    socket.binaryType = "arraybuffer";

    socket.on("error", (err) => {
        console.error("Socket error:", err.message);
    });

    let currentRoom = null;
    let currentPlayer = null;
    let isAlive = true;
    let lastProcessedSeq = 0;

    const playerState = { x: 400, y: 300, angle: 0, thrust: false, turn: 0 };

    socket.on("pong", () => {
        isAlive = true;
    });

    const joinTimeout = setTimeout(() => {
        if (!currentRoom) {
            socket.close(4001, "Join timeout: did not send join message within 5s");
        }
    }, 5000);

    socket.on("message", (rawMessage) => {
        if (rawMessage instanceof ArrayBuffer) {
            const view = new DataView(rawMessage);
            const version = view.getUint8(0);
            const msgType = view.getUint8(1);

            if (msgType === 1) { 
                const seq = view.getUint32(2, true);
                const thrust = view.getUint8(6) === 1;
                const turn = view.getInt8(7);

                lastProcessedSeq = seq;
                playerState.thrust = thrust;
                playerState.turn = turn;
 
                playerState.angle += playerState.turn * 0.05;
            if (playerState.thrust) {
                playerState.x += Math.cos(playerState.angle) * 4;
                playerState.y += Math.sin(playerState.angle) * 4;
         }
    }
        }

        let messageText = rawMessage instanceof Buffer ? rawMessage.toString() : rawMessage;
        let parsed;
        try {
            parsed = JSON.parse(messageText);
        } catch (e) {
            return;
        }

        if (parsed.type === "ping") {
            socket.send(JSON.stringify({ type: "pong" }));
            return;
        }

        const validation = validateMessage(messageText);
        if (!validation.valid) {
            socket.close(4002, validation.error);
            return;
        }

        const msg = validation.data;
        if (msg.type === "join") {
            clearTimeout(joinTimeout);
            currentRoom = roomManager.getOrCreateRoom(msg.room);
            currentPlayer = { name: msg.name };
            socket.player = currentPlayer;
            socket.room = currentRoom;
            currentRoom.addPlayer(socket, currentPlayer);
        }
    });

    const TICK_RATE = 30;
    const STEP_MS = 1000 / TICK_RATE;
    let nextTick = performance.now() + STEP_MS;
    let snapshotTimer = null;

    const runServerTick = () => {
        if (socket.readyState === WebSocket.OPEN) {
            const buf = new ArrayBuffer(26);
            const view = new DataView(buf);

            view.setUint8(0, 1);                                 
            view.setUint8(1, 2);                                 
            view.setFloat64(2, performance.now(), true);         
            view.setUint32(10, lastProcessedSeq, true);          
            view.setFloat32(14, playerState.x, true);            
            view.setFloat32(18, playerState.y, true);            
            view.setFloat32(22, playerState.angle, true);        

            socket.send(buf);
        }

        const now = performance.now();
        const drift = nextTick - now;
        nextTick += STEP_MS;
        snapshotTimer = setTimeout(runServerTick, Math.max(0, STEP_MS + drift));
    };

    snapshotTimer = setTimeout(runServerTick, STEP_MS);

    socket.on("close", () => {
        clearTimeout(joinTimeout);
        clearTimeout(snapshotTimer);
        if (currentRoom) {
            currentRoom.removePlayer(socket);
        }
    });
});

const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
        if (socket.isAlive === false) {
            return socket.terminate();
        }
        socket.isAlive = false;
        socket.ping();
    });
}, 15000);

server.listen(config.PORT, config.HOST, () => {
    console.log(`Server is running at http://${config.HOST}:${config.PORT}`);
});
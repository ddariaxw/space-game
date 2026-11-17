import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
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

    if (url.pathname === "/api/rooms" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024) {
                req.destroy();
            }
        });
        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                const roomId = data.roomId || `room-${Date.now()}`;
                const room = roomManager.getOrCreateRoom(roomId);
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true, roomId: room.id }));
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Invalid JSON body" }));
            }
        });
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
            const contentType = MIME_TYPES[ext] || "application/octet-stream";
            res.writeHead(200, { "Content-Type": contentType });
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
            const msgType = view.getUint8(0);

            if (msgType === 1) { 
                playerState.thrust = view.getUint8(1) === 1;
                playerState.turn = view.getInt8(2);

                if (playerState.thrust) {
                    playerState.x += Math.cos(playerState.angle) * 3;
                    playerState.y += Math.sin(playerState.angle) * 3;
                }
                playerState.angle += playerState.turn * 0.05;
            }
            return;
        }

        let messageText = rawMessage;
        if (rawMessage instanceof Buffer) {
            messageText = rawMessage.toString();
        }

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
        } else if (msg.type === "chat") {
            if (!currentRoom) {
                socket.close(4003, "Not in a room");
                return;
            }
            if (socket.bufferedAmount > 65536) {
                console.warn(`Slow client detected (${currentPlayer?.name}), dropping message.`);
                return;
            }
            currentRoom.broadcast("chat", { name: currentPlayer.name, text: msg.text }, socket);
        }
    });

    const snapshotInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
            const buf = new ArrayBuffer(21);
            const view = new DataView(buf);

            view.setUint8(0, 2);                         
            view.setFloat64(1, performance.now(), true);  
            view.setFloat32(9, playerState.x, true);      
            view.setFloat32(13, playerState.y, true);     
            view.setFloat32(17, playerState.angle, true); 

            socket.send(buf);
        }
    }, 1000 / 30);

    socket.on("close", () => {
        clearTimeout(joinTimeout);
        clearInterval(snapshotInterval);
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

wss.on("close", () => {
    clearInterval(interval);
});

server.listen(config.PORT, config.HOST, () => {
    console.log(`Server is running at http://${config.HOST}:${config.PORT}`);
});

function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);

    wss.clients.forEach((socket) => {
        socket.close(1001, "Server shutting down");
    });

    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
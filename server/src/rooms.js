import { EventEmitter } from "node:events";

export class Room extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.players = new Map();
  }

  addPlayer(socket, playerInfo) {
    this.players.set(socket, playerInfo);
    this.emit("join", playerInfo);
    this.broadcastRoster();
  }

  removePlayer(socket) {
    if (this.players.has(socket)) {
      const playerInfo = this.players.get(socket);
      this.players.delete(socket);
      this.emit("leave", playerInfo);
      this.broadcastRoster();

      if (this.players.size === 0) {
        this.emit("empty", this.id);
      }
    }
  }

  broadcast(type, payload, excludeSocket = null) {
    const message = JSON.stringify({ type, ...payload });
    for (const [socket] of this.players) {
      if (socket !== excludeSocket && socket.readyState === 1) {
        socket.send(message);
      }
    }
  }

  broadcastRoster() {
    const playersList = Array.from(this.players.values());
    this.broadcast("roster", { players: playersList });
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = new Room(roomId);
      room.once("empty", (id) => {
        this.rooms.delete(id);
        console.log(`Room [${id}] is empty and has been deleted.`);
      });
      this.rooms.set(roomId, room);
    }
    return this.rooms.get(roomId);
  }

  getRoomsList() {
    return Array.from(this.rooms.values()).map((room) => ({
      id: room.id,
      playersCount: room.players.size,
    }));
  }
}
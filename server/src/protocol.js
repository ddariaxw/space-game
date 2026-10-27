export function validateMessage(rawMessage) {
  try {
    const data = JSON.parse(rawMessage);

    if (!data || typeof data !== "object" || typeof data.type !== "string") {
      return { valid: false, error: "Invalid message format: missing 'type'" };
    }

    switch (data.type) {
      case "join":
        if (typeof data.room !== "string" || typeof data.name !== "string") {
          return { valid: false, error: "Invalid 'join' payload: room and name required" };
        }
        break;
      case "chat":
        if (typeof data.text !== "string" || data.text.trim().length === 0) {
          return { valid: false, error: "Invalid 'chat' payload: text required" };
        }
        if (data.text.length > 500) {
          return { valid: false, error: "Chat message too long (max 500 characters)" };
        }
        break;
      default:
        return { valid: false, error: `Unknown message type: "${data.type}"` };
    }

    return { valid: true, data };
  } catch (err) {
    return { valid: false, error: "Corrupt JSON: failed to parse message" };
  }
}
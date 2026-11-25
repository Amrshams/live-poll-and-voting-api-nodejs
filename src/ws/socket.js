import { WebSocketServer, WebSocket } from "ws";

let wss

export function initSocket(httpServer) {
    wss = new WebSocketServer({ server: httpServer })
    wss.on("connection", (socket) => {
        console.log("WebSocket client connected");

        socket.on("close", () => {
            console.log("WebSocket client disconnected");
        });

        socket.on("error", (err) => {
            console.error("WebSocket error:", err);
        });
    })
}

export function broadcastPollUpdate(poll) {
    if (!wss) return;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ event: 'VOTE_UPDATE', poll }))
        }
    })
}
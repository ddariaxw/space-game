// client/src/network.js
export class NetworkManager {
    constructor(url) {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer'; 
        this.rtt = 0;
        this.lastPingTime = 0;
        this.onSnapshot = null;

        this.ws.onopen = () => {
            console.log('[Net] Connected to server');
            this.startPingLoop();
        };

        this.ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                this.handleBinaryMessage(event.data);
            }
        };
    }

    startPingLoop() {
        setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.lastPingTime = performance.now();
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 1000);
    }

    sendInput(inputData) {
        if (this.ws.readyState !== WebSocket.OPEN) return;
       
        const buf = new ArrayBuffer(3);
        const view = new DataView(buf);
        view.setUint8(0, 1); 
        view.setUint8(1, inputData.thrust ? 1 : 0);
        view.setInt8(2, inputData.turn || 0);
        
        this.ws.send(buf);
    }

    handleBinaryMessage(buffer) {
        const view = new DataView(buffer);
        const msgType = view.getUint8(0);

        if (msgType === 2) { 
            const serverTime = view.getFloat64(1, true); 
            const x = view.getFloat32(9, true);
            const y = view.getFloat32(13, true);
            const angle = view.getFloat32(17, true);

            if (this.onSnapshot) {
                this.onSnapshot({ serverTime, x, y, angle });
            }
        }
    }
}
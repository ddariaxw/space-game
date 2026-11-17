export class NetworkManager {
    constructor(url) {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';
        this.rtt = 0;
        this.lastPingTime = 0;
        this.onSnapshot = null;
        this.sequenceNumber = 0; 

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

        this.sequenceNumber++;
        const buf = new ArrayBuffer(8);
        const view = new DataView(buf);

        view.setUint8(0, 1);                             
        view.setUint8(1, 1);                            
        view.setUint32(2, this.sequenceNumber, true);    
        view.setUint8(6, inputData.thrust ? 1 : 0);      
        view.setInt8(7, inputData.turn || 0);            

        this.ws.send(buf);
    }

    handleBinaryMessage(buffer) {
        const view = new DataView(buffer);
        const version = view.getUint8(0);
        const msgType = view.getUint8(1);

        if (msgType === 2) { 
            const serverTime = view.getFloat64(2, true);
            const lastProcessedSeq = view.getUint32(10, true);
            const x = view.getFloat32(14, true);
            const y = view.getFloat32(18, true);
            const angle = view.getFloat32(22, true);

            this.rtt = performance.now() - this.lastPingTime;

            if (this.onSnapshot) {
                this.onSnapshot({ serverTime, lastProcessedSeq, x, y, angle });
            }
        }
    }
}
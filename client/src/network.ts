import type { Seq } from '../../shared/types.js';
import { asSeq } from '../../shared/types.js';

export class NetworkManager {
  public ws: WebSocket;
  public rtt: number;
  public lastPingTime: number;
  public onSnapshot: ((snapshot: { serverTime: number; lastProcessedSeq: Seq; x: number; y: number; angle: number }) => void) | null;
  public sequenceNumber: number;

  constructor(url: string) {
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

    this.ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(event.data);
      }
    };
  }

  startPingLoop(): void {
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = performance.now();
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 1000);
  }

  sendInput(inputData: { thrust: boolean; turn: number }): void {
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

  handleBinaryMessage(buffer: ArrayBuffer): void {
    const view = new DataView(buffer);
    const msgType = view.getUint8(1);

    if (msgType === 2) {
      const serverTime = view.getFloat64(2, true);
      const lastProcessedSeq = asSeq(view.getUint32(10, true));
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
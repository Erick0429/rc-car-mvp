export interface FrameRecord {
  step: number;
  timestamp: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  steering: number;
  throttle: number;
  mode: 'manual' | 'autopilot';
}

export class EpisodeRecorder {
  private frames: FrameRecord[] = [];
  private step = 0;
  private _recording = false;

  get recording() { return this._recording; }
  get frameCount() { return this.frames.length; }

  start() {
    this.frames = [];
    this.step = 0;
    this._recording = true;
    console.log('[Telemetry] Episode started');
  }

  stop() {
    this._recording = false;
    console.log(`[Telemetry] Episode stopped — ${this.frames.length} frames`);
  }

  record(data: Omit<FrameRecord, 'step' | 'timestamp'>) {
    if (!this._recording) return;
    this.frames.push({ step: this.step++, timestamp: performance.now(), ...data });
  }

  export(): string {
    return JSON.stringify(this.frames, null, 2);
  }
}

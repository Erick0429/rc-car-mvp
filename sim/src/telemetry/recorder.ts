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

export interface EpisodeExport {
  meta: {
    frames: number;
    image_size: [number, number];  // [W, H]
    action_keys: string[];
    recorded_at: string;
  };
  actions: [number, number][];     // [steering, throttle] per frame
  images: string[];                // base64 JPEG (no data: prefix) per frame
}

export class EpisodeRecorder {
  private frames: FrameRecord[] = [];
  private images: string[] = [];   // base64 JPEG strings
  private step = 0;
  private _recording = false;

  get recording() { return this._recording; }
  get frameCount() { return this.frames.length; }

  start() {
    this.frames = [];
    this.images = [];
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

  /** Call once per frame during recording with base64 JPEG (no data: prefix). */
  addImage(base64Jpeg: string) {
    if (!this._recording) return;
    this.images.push(base64Jpeg);
  }

  exportJSON(): string {
    const out: EpisodeExport = {
      meta: {
        frames:      this.frames.length,
        image_size:  [160, 90],
        action_keys: ['steering', 'throttle'],
        recorded_at: new Date().toISOString(),
      },
      actions: this.frames.map(f => [f.steering, f.throttle]),
      images:  this.images,
    };
    return JSON.stringify(out);
  }

  /** Legacy plain-telemetry export (no images). */
  export(): string {
    return JSON.stringify(this.frames, null, 2);
  }
}

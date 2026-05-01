import type { CameraStatus } from '../types/index';

/** カメラデバイス情報 */
export interface CameraDevice {
  deviceId: string;
  label: string;
}

/**
 * VideoCaptureModule
 *
 * カメラ映像の取得と管理を担当するモジュール。
 * MediaStream API を使用してカメラストリームを取得し、
 * requestAnimationFrame ベースのフレームコールバック機構を提供する。
 */
export class VideoCaptureModule {
  private status: CameraStatus = 'idle';
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private frameCallbacks: Set<(video: HTMLVideoElement) => void> = new Set();
  private currentDeviceId: string | null = null;

  /**
   * 利用可能なカメラデバイスの一覧を取得する。
   * 注意: ブラウザによってはカメラアクセス許可後でないとラベルが取得できない。
   */
  async getAvailableDevices(): Promise<CameraDevice[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `カメラ ${i + 1}`,
      }));
  }

  /** 現在使用中のカメラデバイスIDを取得する */
  getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
  }

  /**
   * カメラデバイスを切り替える。
   * 現在のストリームを停止し、指定デバイスで再開する。
   */
  async switchDevice(deviceId: string, constraints?: MediaStreamConstraints): Promise<void> {
    const wasActive = this.status === 'active';
    if (wasActive) {
      this.stop();
    }

    const mergedConstraints: MediaStreamConstraints = constraints ?? {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    // deviceId を video constraints に注入
    if (typeof mergedConstraints.video === 'object' && mergedConstraints.video !== null) {
      (mergedConstraints.video as MediaTrackConstraints).deviceId = { exact: deviceId };
    } else {
      mergedConstraints.video = { deviceId: { exact: deviceId } };
    }

    await this.start(mergedConstraints);
  }

  /** カメラストリームを開始する */
  async start(constraints?: MediaStreamConstraints): Promise<void> {
    if (this.status === 'active') {
      return;
    }

    this.status = 'requesting';

    const defaultConstraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    const mergedConstraints = constraints ?? defaultConstraints;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(mergedConstraints);
    } catch (error: unknown) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          this.status = 'denied';
        } else if (error.name === 'NotFoundError') {
          this.status = 'not_found';
        } else {
          this.status = 'error';
        }
      } else {
        this.status = 'error';
      }
      throw error;
    }

    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = this.stream;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;

    await this.videoElement.play();

    // Track the active device ID
    const videoTrack = this.stream.getVideoTracks()[0];
    this.currentDeviceId = videoTrack?.getSettings().deviceId ?? null;

    this.status = 'active';
    this.startFrameLoop();
  }

  /** カメラストリームを停止する */
  stop(): void {
    this.stopFrameLoop();

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.status = 'idle';
  }

  /** 現在のフレームを取得する */
  getCurrentFrame(): HTMLVideoElement | null {
    if (this.status !== 'active') {
      return null;
    }
    return this.videoElement;
  }

  /** フレーム更新時のコールバックを登録する */
  onFrame(callback: (video: HTMLVideoElement) => void): void {
    this.frameCallbacks.add(callback);
  }

  /** フレーム更新時のコールバックを解除する */
  offFrame(callback: (video: HTMLVideoElement) => void): void {
    this.frameCallbacks.delete(callback);
  }

  /** カメラの状態を取得する */
  getStatus(): CameraStatus {
    return this.status;
  }

  /** requestAnimationFrame ベースのフレームループを開始する */
  private startFrameLoop(): void {
    const loop = (): void => {
      if (this.status !== 'active' || !this.videoElement) {
        return;
      }

      for (const callback of this.frameCallbacks) {
        callback(this.videoElement);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /** フレームループを停止する */
  private stopFrameLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

import './style.css';

import type {
  AppState,
  AppSettings,
  Point2D,
  ToeFrame,
  SmoothingConfig,
  TapConfig,
} from './types/index.ts';

import { VideoCaptureModule } from './core/VideoCaptureModule.ts';
import { PoseDetector } from './core/PoseDetector.ts';
import { ContourToeDetector } from './core/ContourToeDetector.ts';
import type { IToeDetector } from './core/ToeDetectorInterface.ts';
import { CoordinateMapper } from './core/CoordinateMapper.ts';
import { applySmoothing } from './core/SmoothingFilter.ts';
import { detectTap } from './core/TapDetector.ts';
import { CursorController } from './core/CursorController.ts';
import { CalibrationModule } from './calibration/CalibrationModule.ts';
import { SettingsManager } from './config/Settings.ts';

import { CursorOverlay } from './ui/CursorOverlay.ts';
import { StatusIndicator } from './ui/StatusIndicator.ts';
import { CameraPreview } from './ui/CameraPreview.ts';
import { SettingsPanel } from './ui/SettingsPanel.ts';
import { CalibrationUI } from './ui/CalibrationUI.ts';
import { NotificationBanner } from './ui/NotificationBanner.ts';

// =============================================================================
// Application State
// =============================================================================

const state: AppState = {
  cameraStatus: 'idle',
  detectionStatus: 'lost',
  calibrationStatus: 'uncalibrated',
  cursorPosition: { x: 0, y: 0 },
  currentFps: 0,
  settings: undefined!,  // set after SettingsManager init
};

// =============================================================================
// Pipeline State (mutable, used in the frame loop)
// =============================================================================

/** Previous smoothed position for EMA */
let previousSmoothedPosition: Point2D | null = null;

/** Z-coordinate history for tap detection */
let toeFrameHistory: ToeFrame[] = [];

/** Last tap timestamp for cooldown / double-tap logic */
let lastTapTimestamp: number | null = null;

/** Current smoothing config (updated from settings) */
let smoothingConfig: SmoothingConfig;

/** Current tap config (updated from settings) */
let tapConfig: TapConfig;

/** Max frames to keep in toe history */
const MAX_TOE_HISTORY = 20;

// =============================================================================
// FPS Tracking
// =============================================================================

let frameCount = 0;
let fpsLastTime = performance.now();
const FPS_UPDATE_INTERVAL_MS = 1000;
const LOW_FPS_THRESHOLD = 15;
let lowFpsWarningShown = false;

// =============================================================================
// Module Instances (assigned during init)
// =============================================================================

let videoCapture: VideoCaptureModule;
let poseDetector: PoseDetector;
let contourDetector: ContourToeDetector;
let activeDetector: IToeDetector;
let coordinateMapper: CoordinateMapper;
let cursorController: CursorController;
let calibrationModule: CalibrationModule;
let settingsManager: SettingsManager;

let cursorOverlay: CursorOverlay;
let statusIndicator: StatusIndicator;
let cameraPreview: CameraPreview;
let settingsPanel: SettingsPanel;
let calibrationUI: CalibrationUI;
let notificationBanner: NotificationBanner;

// =============================================================================
// Main Initialization
// =============================================================================

async function main(): Promise<void> {
  // 1. Settings (first — provides config to all other modules)
  settingsManager = new SettingsManager();
  const settings = settingsManager.get();
  state.settings = settings;
  smoothingConfig = settings.smoothing;
  tapConfig = settings.tap;

  // 2. Core modules
  videoCapture = new VideoCaptureModule();
  poseDetector = new PoseDetector();
  contourDetector = new ContourToeDetector();
  coordinateMapper = new CoordinateMapper();

  const screenSize = { width: window.innerWidth, height: window.innerHeight };
  cursorController = new CursorController(screenSize);

  // 3. Calibration
  calibrationModule = new CalibrationModule();

  // 4. UI components
  cursorOverlay = new CursorOverlay();
  statusIndicator = new StatusIndicator();
  cameraPreview = new CameraPreview();
  notificationBanner = new NotificationBanner();
  settingsPanel = new SettingsPanel(settingsManager);
  calibrationUI = new CalibrationUI(calibrationModule);

  // 5. Apply target foot from settings and select active detector
  poseDetector.setTargetFoot(settings.targetFoot);
  activeDetector = settings.detectionMode === 'contour' ? contourDetector : poseDetector;

  // 6. Settings change handler
  settingsManager.onChange(onSettingsChange);

  // 7. Window resize handler
  window.addEventListener('resize', () => {
    cursorController.setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });

  // 8. Load saved calibration
  const savedCalibration = calibrationModule.load();
  if (savedCalibration) {
    coordinateMapper.setCalibration(savedCalibration);
    state.calibrationStatus = 'calibrated';
  }

  // 9. Set up calibration UI callback
  setupCalibrationCallbacks();

  // 9.5 Set up camera switch handler
  settingsPanel.onCameraChange = async (deviceId: string) => {
    try {
      const settings = settingsManager.get();
      await videoCapture.switchDevice(deviceId, {
        video: {
          width: { ideal: settings.camera.width },
          height: { ideal: settings.camera.height },
          frameRate: { ideal: settings.camera.frameRate },
        },
        audio: false,
      });

      // Reconnect camera preview
      const videoEl = videoCapture.getCurrentFrame();
      if (videoEl) {
        cameraPreview.setVideoSource(videoEl);
      }
    } catch (_err) {
      notificationBanner.show('カメラの切り替えに失敗しました', 'error');
    }
  };

  // 9.6 Set up recalibrate handler
  settingsPanel.onRecalibrate = () => {
    calibrationUI.show();
  };

  // 9.7 Set up background recapture handler (contour mode)
  settingsPanel.onRecaptureBackground = () => {
    contourDetector.resetBackground();
    notificationBanner.show(
      '足をカメラの視野から外してください。約1秒後に背景をキャプチャします。',
      'warning',
      3000,
    );
  };

  // 9.8 Set up contour detector callbacks
  contourDetector.onWarmupStarted = () => {
    notificationBanner.show(
      '背景をキャプチャ中... 足をカメラの視野から外してください。',
      'warning',
      2000,
    );
  };
  contourDetector.onBackgroundCaptured = () => {
    notificationBanner.show(
      '背景キャプチャ完了。足をカメラの視野に入れてください。',
      'warning',
      3000,
    );
  };

  // 10. Initialize active detector
  try {
    await activeDetector.initialize();
  } catch (_err) {
    if (settings.detectionMode === 'mediapipe') {
      notificationBanner.showModelLoadError();
    }
    // Continue — the app can still show UI, but detection won't work
  }

  // 11. Start camera
  try {
    await videoCapture.start({
      video: {
        width: { ideal: settings.camera.width },
        height: { ideal: settings.camera.height },
        frameRate: { ideal: settings.camera.frameRate },
      },
      audio: false,
    });

    state.cameraStatus = 'active';

    // Connect camera preview
    const videoEl = videoCapture.getCurrentFrame();
    if (videoEl) {
      cameraPreview.setVideoSource(videoEl);
    }

    // Populate camera device list in settings panel
    try {
      const devices = await videoCapture.getAvailableDevices();
      settingsPanel.updateCameraDevices(devices, videoCapture.getCurrentDeviceId());
    } catch (_e) {
      // enumerateDevices may fail in some environments; ignore
    }

    // Show cursor
    cursorOverlay.show();

  } catch (_err) {
    state.cameraStatus = videoCapture.getStatus();

    if (state.cameraStatus === 'denied') {
      notificationBanner.showCameraDenied();
    } else if (state.cameraStatus === 'not_found') {
      notificationBanner.showCameraNotFound();
    } else {
      notificationBanner.show('カメラの起動に失敗しました', 'error');
    }
    return;
  }

  // 12. Show calibration prompt if not calibrated
  if (state.calibrationStatus !== 'calibrated') {
    calibrationUI.showPrompt();
  }

  // 13. Register frame processing callback
  videoCapture.onFrame(processFrame);
}

// =============================================================================
// Frame Processing Pipeline
// =============================================================================

async function processFrame(video: HTMLVideoElement): Promise<void> {
  // FPS tracking
  trackFps();

  // Run pose detection
  const detectionResult = await activeDetector.detect(video);

  // Update detection status
  const prevDetectionStatus = state.detectionStatus;
  if (detectionResult.detected && detectionResult.position) {
    state.detectionStatus = 'detecting';

    // Extract 2D position from camera space
    const cameraPoint: Point2D = {
      x: detectionResult.position.x,
      y: detectionResult.position.y,
    };

    // Update latest camera point for calibration
    latestCameraPoint = cameraPoint;

    // Map to screen coordinates
    const screenSize = { width: window.innerWidth, height: window.innerHeight };
    const screenPoint = coordinateMapper.mapToScreen(cameraPoint, screenSize);

    // Apply smoothing
    const smoothedPoint = previousSmoothedPosition
      ? applySmoothing(screenPoint, previousSmoothedPosition, smoothingConfig)
      : screenPoint;
    previousSmoothedPosition = smoothedPoint;

    // Update cursor
    cursorController.updatePosition(smoothedPoint);
    state.cursorPosition = cursorController.getPosition();

    // Update UI
    cursorOverlay.updatePosition(state.cursorPosition.x, state.cursorPosition.y);

    // Update camera preview toe marker (in camera-space pixel coords)
    const previewX = detectionResult.position.x * CameraPreview.DEFAULT_WIDTH;
    const previewY = detectionResult.position.y * CameraPreview.DEFAULT_HEIGHT;
    cameraPreview.updateToePosition(previewX, previewY);

    // Tap detection: add z-coordinate to history
    toeFrameHistory.push({
      z: detectionResult.position.z,
      timestamp: detectionResult.timestamp,
    });
    if (toeFrameHistory.length > MAX_TOE_HISTORY) {
      toeFrameHistory = toeFrameHistory.slice(-MAX_TOE_HISTORY);
    }

    // Run tap detection
    const tapResult = detectTap(toeFrameHistory, tapConfig, lastTapTimestamp);
    lastTapTimestamp = tapResult.lastTapTimestamp;

    if (tapResult.event === 'tap') {
      cursorController.emitClick(state.cursorPosition);
      cursorOverlay.pulse();
    } else if (tapResult.event === 'doubletap') {
      cursorController.emitDoubleClick(state.cursorPosition);
      cursorOverlay.pulse();
    }

    // Status: detection resumed
    if (prevDetectionStatus === 'lost') {
      statusIndicator.setStatus('detecting');
    }
  } else {
    // Detection lost
    state.detectionStatus = 'lost';
    latestCameraPoint = null;
    cameraPreview.clearToePosition();

    if (prevDetectionStatus === 'detecting') {
      statusIndicator.setStatus('lost');
    }
  }
}

// =============================================================================
// FPS Tracking
// =============================================================================

function trackFps(): void {
  frameCount++;
  const now = performance.now();
  const elapsed = now - fpsLastTime;

  if (elapsed >= FPS_UPDATE_INTERVAL_MS) {
    const fps = (frameCount / elapsed) * 1000;
    state.currentFps = fps;
    frameCount = 0;
    fpsLastTime = now;

    // Update UI
    statusIndicator.updateFps(fps);

    // Performance warning
    if (fps < LOW_FPS_THRESHOLD && !lowFpsWarningShown) {
      notificationBanner.showPerformanceWarning();
      lowFpsWarningShown = true;
    } else if (fps >= LOW_FPS_THRESHOLD) {
      lowFpsWarningShown = false;
    }
  }
}

// =============================================================================
// Calibration Callbacks
// =============================================================================

/** 最新のカメラ空間つま先座標（フレームループで更新される） */
let latestCameraPoint: Point2D | null = null;

function setupCalibrationCallbacks(): void {
  // キャリブレーションUIでマーカーがクリックされた時、
  // PoseDetectorの最新検出結果からカメラ空間座標を取得して記録する。
  calibrationUI.onRecordRequest = (screenPoint: Point2D): boolean => {
    if (!latestCameraPoint) {
      // つま先が検出されていない場合は記録できない
      notificationBanner.show(
        'つま先が検出されていません。つま先をターゲット位置に置いてください。',
        'warning',
        3000,
      );
      return false;
    }

    // カメラ空間座標（0〜1正規化）とスクリーン座標のペアを記録
    calibrationModule.recordPoint(
      { x: latestCameraPoint.x, y: latestCameraPoint.y },
      screenPoint,
    );

    const progress = calibrationModule.getProgress();
    if (progress.recordedPoints >= progress.requiredPoints) {
      const matrix = calibrationModule.complete();
      if (matrix) {
        coordinateMapper.setCalibration(matrix);
        calibrationModule.save(matrix);
        state.calibrationStatus = 'calibrated';
      }
    }

    return true;
  };
}

// =============================================================================
// Settings Change Handler
// =============================================================================

function onSettingsChange(settings: AppSettings): void {
  state.settings = settings;

  // Update pose detector target foot
  poseDetector.setTargetFoot(settings.targetFoot);

  // Switch detection mode if changed
  const newDetector = settings.detectionMode === 'contour' ? contourDetector : poseDetector;
  if (newDetector !== activeDetector) {
    activeDetector = newDetector;
    // Initialize the new detector if needed
    activeDetector.initialize().catch(() => {
      if (settings.detectionMode === 'mediapipe') {
        notificationBanner.showModelLoadError();
      }
    });
    // Reset smoothing state on detector switch
    previousSmoothedPosition = null;
    toeFrameHistory = [];
    lastTapTimestamp = null;
  }

  // Update smoothing config
  smoothingConfig = settings.smoothing;

  // Update tap config
  tapConfig = settings.tap;
}

// =============================================================================
// Cleanup
// =============================================================================

/** Dispose all modules and release resources */
export function dispose(): void {
  videoCapture.stop();
  poseDetector.dispose();
  contourDetector.dispose();
  cursorOverlay.dispose();
  statusIndicator.dispose();
  cameraPreview.dispose();
  settingsPanel.dispose();
  calibrationUI.dispose();
  notificationBanner.dispose();
}

// =============================================================================
// Start Application
// =============================================================================

main().catch((err) => {
  console.error('Toe Cursor Control: Failed to initialize', err);
});

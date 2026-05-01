# 実装計画: Toe Cursor Control

## 概要

天井設置Webカメラによるつま先検出でWebアプリ上のカーソル操作・クリック操作を実現するブラウザベース入力システムの実装計画。TypeScript + Vite構成で、MediaPipe Pose Landmarkerによる姿勢推定、ホモグラフィ変換による座標マッピング、EMAスムージング、タップ検出を段階的に実装する。

## タスク

- [x] 1. プロジェクト初期セットアップと型定義
  - [x] 1.1 Viteプロジェクトの初期化とTypeScript設定
    - `npm create vite@latest` でプロジェクトを作成（vanilla-ts テンプレート）
    - `vitest`、`fast-check` を開発依存として追加
    - `tsconfig.json` の strict モードを有効化
    - `vite.config.ts` を設定
    - _Requirements: 7.5_

  - [x] 1.2 型定義ファイルの作成
    - `src/types/index.ts` に `Point2D`、`Point3D`、`ScreenSize`、`HomographyMatrix` を定義
    - `CameraStatus`、`ToeDetectionResult`、`ToeFrame`、`TapResult`、`TapConfig`、`SmoothingConfig` を定義
    - `SystemEvent`、`AppState`、`AppSettings`、`CalibrationProgress` を定義
    - `DEFAULT_SETTINGS` 定数を定義
    - _Requirements: 全要件の基盤_

- [x] 2. ホモグラフィ変換（座標変換コアロジック）
  - [x] 2.1 ホモグラフィ行列の計算と適用の実装
    - `src/calibration/HomographyMatrix.ts` を作成
    - `computeHomography(srcPoints, dstPoints): number[]` を純粋関数として実装（4点の対応関係から3x3変換行列を算出）
    - `applyHomography(matrix, point): Point2D` を純粋関数として実装
    - _Requirements: 3.2, 3.3_

  - [ ]* 2.2 ホモグラフィ変換のラウンドトリップ プロパティテスト
    - **Property 3: ホモグラフィ変換のラウンドトリップ**
    - `src/__tests__/properties/homography.property.test.ts` を作成
    - 非退化な4点の対応関係を生成し、computeHomography → applyHomography のラウンドトリップで誤差1e-6以内を検証
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 2.3 座標変換の範囲不変条件 プロパティテスト
    - **Property 4: 座標変換の範囲不変条件**
    - Camera Space内の座標（0≤x≤1, 0≤y≤1）に対して、変換+クランプ後の座標がScreen Space範囲内に収まることを検証
    - **Validates: Requirements 3.4, 4.5**

- [x] 3. EMAスムージングフィルター
  - [x] 3.1 EMAスムージングとデッドゾーン処理の実装
    - `src/core/SmoothingFilter.ts` を作成
    - `applyEMA(current, previous, alpha): Point2D` を純粋関数として実装
    - `applySmoothing(current, previous, config): Point2D` をデッドゾーン付きで実装
    - _Requirements: 4.3, 4.4_

  - [ ]* 3.2 スムージングによる分散低減 プロパティテスト
    - **Property 5: スムージングによる分散低減**
    - `src/__tests__/properties/smoothing.property.test.ts` を作成
    - 任意の座標系列（3点以上）とα（0<α<1）に対して、EMA適用後の分散が元の分散以下であることを検証
    - **Validates: Requirements 4.3**

  - [ ]* 3.3 デッドゾーン内の安定性 プロパティテスト
    - **Property 6: デッドゾーン内の安定性**
    - 基準点からデッドゾーン半径以内の座標に対して、出力がデッドゾーン半径以内に留まることを検証
    - **Validates: Requirements 4.4**

- [x] 4. タップ検出ロジック
  - [x] 4.1 タップ検出の純粋関数実装
    - `src/core/TapDetector.ts` を作成
    - `detectTap(history, config): TapResult` を純粋関数として実装
    - z座標の速度計算、閾値判定、クールダウン処理、ダブルタップ判定を含む
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [ ]* 4.2 タップ閾値による分類 プロパティテスト
    - **Property 7: タップ閾値による分類**
    - `src/__tests__/properties/tapDetector.property.test.ts` を作成
    - 下降速度が閾値を超えて上昇に反転するパターンはタップ検出、閾値未満はタップ非検出を検証
    - **Validates: Requirements 5.1, 5.4**

  - [ ]* 4.3 タップクールダウン プロパティテスト
    - **Property 8: タップクールダウン**
    - cooldownMs以内の2つ目のタップは無視、超えた場合は検出されることを検証
    - **Validates: Requirements 5.3**

  - [ ]* 4.4 ダブルタップウィンドウ プロパティテスト
    - **Property 9: ダブルタップウィンドウ**
    - doubleTapWindowMs以内の2つ目のタップはダブルタップ、超えた場合は独立したシングルタップを検証
    - **Validates: Requirements 5.5**

- [x] 5. チェックポイント - コアロジックの検証
  - すべてのテストが通ることを確認し、疑問点があればユーザーに質問する。

- [x] 6. カメラ映像取得モジュール
  - [x] 6.1 VideoCaptureModuleの実装
    - `src/core/VideoCaptureModule.ts` を作成
    - MediaStream API (`getUserMedia`) を使用したカメラストリーム取得を実装
    - カメラアクセス拒否・デバイス未検出時のエラーハンドリングを実装
    - フレームコールバック機構（`requestAnimationFrame` ベース）を実装
    - `CameraStatus` の状態管理を実装
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 6.2 VideoCaptureModuleのユニットテスト
    - `src/__tests__/unit/VideoCaptureModule.test.ts` を作成
    - MediaStream APIのモックを使用してカメラアクセス拒否・未検出時のエラーハンドリングをテスト
    - _Requirements: 1.3, 1.4_

- [x] 7. 姿勢推定モジュール（PoseDetector）
  - [x] 7.1 PoseDetectorの実装
    - `src/core/PoseDetector.ts` を作成
    - MediaPipe Pose Landmarkerの初期化とモデル読み込みを実装
    - `detect(video)` メソッドで映像フレームからつま先ランドマーク（左足: index 31、右足: index 32）を抽出
    - 検出対象の足の切り替え（`setTargetFoot`）を実装
    - 検出ロスト時の最後の位置保持と状態通知を実装
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 7.2 足の選択の正確性 プロパティテスト
    - **Property 1: 足の選択の正確性**
    - `src/__tests__/properties/footSelection.property.test.ts` を作成
    - 任意のランドマーク配列と足の設定に対して、正しいインデックス（左:31、右:32）のランドマークが返されることを検証
    - **Validates: Requirements 2.3**

  - [ ]* 7.3 検出状態のラウンドトリップ プロパティテスト
    - **Property 2: 検出状態のラウンドトリップ**
    - `src/__tests__/properties/detectionState.property.test.ts` を作成
    - 検出成功→ロスト→再開のシーケンスで、ロスト中は最後の位置保持、再検出後は新位置に更新されることを検証
    - **Validates: Requirements 2.4, 2.5**

- [x] 8. 座標変換モジュール（CoordinateMapper）
  - [x] 8.1 CoordinateMapperの実装
    - `src/core/CoordinateMapper.ts` を作成
    - `setCalibration(matrix)` でホモグラフィ行列を設定
    - `mapToScreen(point, screenSize)` でCamera Space→Screen Space変換を実装（クランプ処理含む）
    - `isCalibrated()` でキャリブレーション状態を返す
    - _Requirements: 3.3, 3.4_

- [x] 9. チェックポイント - 検出・変換パイプラインの検証
  - すべてのテストが通ることを確認し、疑問点があればユーザーに質問する。

- [x] 10. キャリブレーションモジュール
  - [x] 10.1 CalibrationModuleの実装
    - `src/calibration/CalibrationModule.ts` を作成
    - 4点のキャリブレーション手順管理（ポイント記録、進捗管理）を実装
    - `complete()` でホモグラフィ行列を算出
    - `localStorage` を使用したキャリブレーションデータの保存・読み込みを実装
    - 退化した4点（同一直線上）のバリデーションを実装
    - _Requirements: 3.1, 3.2, 3.5_

  - [ ]* 10.2 CalibrationModuleのユニットテスト
    - `src/__tests__/unit/CalibrationModule.test.ts` を作成
    - キャリブレーション手順の進捗管理、保存・読み込み、退化ポイントのエラーハンドリングをテスト
    - _Requirements: 3.1, 3.2, 3.5_

- [x] 11. カーソル制御モジュール
  - [x] 11.1 CursorControllerの実装
    - `src/core/CursorController.ts` を作成
    - `updatePosition(position)` でカーソル位置を更新
    - `emitClick(position)` と `emitDoubleClick(position)` でDOMクリックイベントを発火
    - カーソル位置のScreen Space範囲内クランプを実装
    - _Requirements: 4.1, 4.2, 4.5, 5.2, 5.5_

  - [ ]* 11.2 CursorControllerのユニットテスト
    - `src/__tests__/unit/CursorController.test.ts` を作成
    - カーソル位置更新、クリックイベント発火、範囲クランプをテスト
    - _Requirements: 4.1, 5.2_

- [x] 12. 設定管理モジュール
  - [x] 12.1 SettingsManagerの実装
    - `src/config/Settings.ts` を作成
    - `DEFAULT_SETTINGS` に基づく設定管理を実装
    - 設定変更の即時反映機構（コールバック/イベント）を実装
    - `localStorage` を使用した設定の永続化を実装
    - _Requirements: 6.3, 6.4_

  - [ ]* 12.2 SettingsManagerのユニットテスト
    - `src/__tests__/unit/SettingsManager.test.ts` を作成
    - デフォルト設定、設定変更、永続化をテスト
    - _Requirements: 6.3, 6.4_

- [x] 13. チェックポイント - 全モジュールの検証
  - すべてのテストが通ることを確認し、疑問点があればユーザーに質問する。

- [x] 14. UIレイヤーの実装
  - [x] 14.1 カーソルオーバーレイとステータスインジケータの実装
    - `src/ui/CursorOverlay.ts` を作成 - カーソルの視覚的表示（カスタムカーソル要素）
    - `src/ui/StatusIndicator.ts` を作成 - 検出状態（検出中/ロスト）の視覚的表示
    - _Requirements: 6.1, 6.2_

  - [x] 14.2 カメラプレビューの実装
    - `src/ui/CameraPreview.ts` を作成
    - カメラ映像のプレビュー表示を実装
    - 検出されたつま先位置のオーバーレイ表示を実装
    - _Requirements: 6.5_

  - [x] 14.3 設定パネルの実装
    - `src/ui/SettingsPanel.ts` を作成
    - タップ感度、スムージング強度、検出対象の足（左/右）の設定UIを実装
    - 設定変更時の即時反映を実装
    - _Requirements: 6.3, 6.4_

  - [x] 14.4 キャリブレーションUIの実装
    - キャリブレーション手順のガイドUI（4点の指示表示、進捗表示）を実装
    - キャリブレーション未実施時のプロンプト表示を実装
    - _Requirements: 3.1, 3.5_

  - [x] 14.5 エラーメッセージとパフォーマンス警告の実装
    - カメラアクセス拒否・デバイス未検出時のエラーメッセージ表示を実装
    - FPS低下時（15fps以下）の警告バナー表示を実装
    - _Requirements: 1.3, 1.4, 7.4_

- [x] 15. メインパイプラインの統合
  - [x] 15.1 メインエントリーポイントとパイプラインの統合
    - `src/main.ts` を作成
    - `src/index.html` を作成
    - 全モジュールの初期化と接続: VideoCaptureModule → PoseDetector → CoordinateMapper → SmoothingFilter → CursorController
    - TapDetector → CursorController のイベント接続
    - CalibrationModule → CoordinateMapper の変換行列連携
    - SettingsManager → 各モジュールへの設定反映
    - FPS計測とパフォーマンス監視ループの実装
    - アプリケーション状態（`AppState`）の管理を実装
    - _Requirements: 1.2, 4.1, 4.2, 7.1, 7.2, 7.3_

  - [ ]* 15.2 パイプライン統合テスト
    - `src/__tests__/integration/pipeline.test.ts` を作成
    - モックを使用してパイプライン全体のデータフロー（映像フレーム→カーソル更新）を検証
    - _Requirements: 7.1_

- [x] 16. 最終チェックポイント - 全テスト通過確認
  - すべてのテストが通ることを確認し、疑問点があればユーザーに質問する。

## 備考

- `*` マーク付きのタスクはオプションであり、MVP実装を優先する場合はスキップ可能
- 各タスクは対応する要件番号を参照しており、トレーサビリティを確保
- チェックポイントで段階的に検証を行い、問題の早期発見を促進
- プロパティテストは正当性プロパティ（設計ドキュメント定義）に基づき、コアロジックの普遍的な正しさを検証
- ユニットテストは特定のシナリオ、エッジケース、エラー条件を検証

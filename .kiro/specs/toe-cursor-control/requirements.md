# 要件定義書

## はじめに

本ドキュメントは、天井に設置したWebカメラを用いて足のつま先を検出し、Webアプリケーション上のカーソル操作およびクリック操作を実現する入力システム「Toe Cursor Control」の要件を定義する。ユーザーは足のつま先の位置でカーソルを移動し、地面をつま先で叩く動作でクリックイベントを発生させることができる。

## 用語集

- **System**: Toe Cursor Control Webアプリケーション全体
- **Video_Capture_Module**: ブラウザのMediaStream APIを使用してWebカメラ映像を取得するモジュール
- **Pose_Detector**: カメラ映像からリアルタイムで足のつま先の位置を検出するモジュール（MediaPipeまたはTensorFlow.jsベース）
- **Coordinate_Mapper**: カメラ空間の座標をスクリーン空間の座標に変換するモジュール
- **Tap_Detector**: つま先の垂直方向の動きを分析し、地面を叩く動作（タップ）を検出するモジュール
- **Cursor_Controller**: 検出されたつま先位置に基づいてWebアプリ上のカーソルを制御するモジュール
- **Calibration_Module**: カメラ空間とスクリーン空間のマッピングを校正するモジュール
- **Tap**: つま先が一定の高さから地面方向に素早く移動し、再び上昇する動作
- **Camera_Space**: Webカメラが撮影する2D映像上の座標系
- **Screen_Space**: Webアプリケーションの表示領域における座標系

## 要件

### 要件 1: Webカメラ映像の取得

**ユーザーストーリー:** ユーザーとして、ブラウザ上でWebカメラの映像をリアルタイムに取得したい。それにより、足のつま先の検出処理に映像データを供給できる。

#### 受け入れ基準

1. WHEN ユーザーがアプリケーションを起動した時、THE Video_Capture_Module SHALL ブラウザのMediaStream APIを使用してカメラへのアクセス許可を要求する
2. WHEN カメラへのアクセスが許可された時、THE Video_Capture_Module SHALL カメラ映像のストリームを取得し、Pose_Detectorへリアルタイムに供給する
3. IF カメラへのアクセスが拒否された場合、THEN THE System SHALL ユーザーにカメラアクセスが必要である旨のエラーメッセージを表示する
4. IF カメラデバイスが検出されない場合、THEN THE System SHALL 利用可能なカメラが見つからない旨のエラーメッセージを表示する
5. WHILE カメラ映像が取得されている間、THE Video_Capture_Module SHALL 最低30fpsのフレームレートで映像フレームを供給する

### 要件 2: つま先の検出

**ユーザーストーリー:** ユーザーとして、カメラ映像から自分の足のつま先がリアルタイムに検出されてほしい。それにより、つま先の位置をカーソル操作に利用できる。

#### 受け入れ基準

1. WHEN 映像フレームがPose_Detectorに供給された時、THE Pose_Detector SHALL フレーム内の足のつま先の位置をCamera_Space座標として検出する
2. WHILE 映像が供給されている間、THE Pose_Detector SHALL 各フレームに対して100ms以内につま先位置の検出結果を返す
3. WHEN 複数の足が映像内に存在する時、THE Pose_Detector SHALL 操作対象として指定された片足のつま先のみを追跡する
4. IF つま先が映像フレーム内に検出されない場合、THEN THE Pose_Detector SHALL カーソル位置を最後に検出された位置に保持し、検出ロスト状態をシステムに通知する
5. WHEN つま先が再び検出された時、THE Pose_Detector SHALL 追跡を再開し、検出ロスト状態を解除する

### 要件 3: 座標変換とキャリブレーション

**ユーザーストーリー:** ユーザーとして、カメラが撮影した映像上のつま先位置が正確にスクリーン上のカーソル位置に対応してほしい。それにより、直感的にカーソルを操作できる。

#### 受け入れ基準

1. WHEN アプリケーションが初回起動された時、THE Calibration_Module SHALL キャリブレーション手順をユーザーに提示する
2. WHEN キャリブレーションが実行された時、THE Calibration_Module SHALL Camera_SpaceからScreen_Spaceへの変換パラメータを算出し保存する
3. WHEN つま先のCamera_Space座標が検出された時、THE Coordinate_Mapper SHALL キャリブレーションパラメータを使用してScreen_Space座標に変換する
4. THE Coordinate_Mapper SHALL Camera_Spaceの検出領域全体をScreen_Spaceの表示領域全体にマッピングする
5. IF キャリブレーションデータが存在しない場合、THEN THE System SHALL キャリブレーションの実行をユーザーに促す

### 要件 4: カーソル制御

**ユーザーストーリー:** ユーザーとして、つま先の動きに追従してWebアプリ上のカーソルが滑らかに移動してほしい。それにより、画面上の要素を正確に指し示すことができる。

#### 受け入れ基準

1. WHEN Coordinate_MapperからScreen_Space座標が出力された時、THE Cursor_Controller SHALL カーソルを該当座標に移動する
2. WHILE つま先が移動している間、THE Cursor_Controller SHALL カーソル位置を16ms以内の遅延で更新する
3. THE Cursor_Controller SHALL カーソルの移動にスムージング処理を適用し、微細な検出ノイズによるカーソルの振動を抑制する
4. WHILE つま先が静止している間、THE Cursor_Controller SHALL カーソル位置を安定して保持する
5. THE Cursor_Controller SHALL カーソルをScreen_Spaceの表示領域内に制限する

### 要件 5: タップ検出（クリック操作）

**ユーザーストーリー:** ユーザーとして、地面をつま先で叩く動作でクリック操作を行いたい。それにより、手を使わずにWebアプリの要素を操作できる。

#### 受け入れ基準

1. WHEN つま先が一定の速度閾値を超えて下方向に移動した後、上方向に反転した時、THE Tap_Detector SHALL Tap動作として検出する
2. WHEN Tapが検出された時、THE Cursor_Controller SHALL 現在のカーソル位置でクリックイベントを発生させる
3. THE Tap_Detector SHALL Tap検出後、300ms以内の連続Tapを無視し、誤検出による連続クリックを防止する
4. IF つま先の下方向移動が速度閾値未満の場合、THEN THE Tap_Detector SHALL Tapとして検出せず、通常の移動として処理する
5. WHEN 2回のTapが500ms以内に連続して検出された時、THE Cursor_Controller SHALL ダブルクリックイベントを発生させる

### 要件 6: ユーザーインターフェース

**ユーザーストーリー:** ユーザーとして、システムの状態を視覚的に確認し、設定を調整したい。それにより、快適にシステムを利用できる。

#### 受け入れ基準

1. THE System SHALL カーソルの現在位置を視覚的に表示する
2. THE System SHALL つま先の検出状態（検出中/ロスト）を視覚的に表示する
3. WHEN ユーザーが設定画面を開いた時、THE System SHALL タップ感度、スムージング強度、検出対象の足（左/右）の設定項目を表示する
4. WHEN ユーザーが設定を変更した時、THE System SHALL 変更を即座に反映する
5. THE System SHALL カメラ映像のプレビューを表示し、検出されたつま先の位置をオーバーレイ表示する

### 要件 7: パフォーマンスと信頼性

**ユーザーストーリー:** ユーザーとして、システムが低遅延で安定して動作してほしい。それにより、ストレスなく操作できる。

#### 受け入れ基準

1. THE System SHALL カメラ映像取得からカーソル移動までの全体レイテンシを150ms以内に維持する
2. THE System SHALL 連続1時間以上の使用においてメモリリークなく安定して動作する
3. WHILE システムが動作している間、THE System SHALL CPU使用率を50%以下に維持する
4. IF フレームレートが15fps以下に低下した場合、THEN THE System SHALL ユーザーにパフォーマンス低下の警告を表示する
5. THE System SHALL Chrome、Firefox、Edgeの最新バージョンで動作する

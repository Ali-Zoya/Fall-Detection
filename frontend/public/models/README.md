# MediaPipe model

SafeWalk needs this file in this folder:

    pose_landmarker_lite.task

It is the official **MediaPipe Pose Landmarker (lite, float16)** model published by Google:

    https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task

Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

`npm install` (or `npm run setup:mediapipe`) downloads it for you. To download it by hand on Windows PowerShell,
run this from the `frontend` folder:

    Invoke-WebRequest -Uri "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task" -OutFile "public\models\pose_landmarker_lite.task"

The model is licensed by Google under the Apache License 2.0 (see the MediaPipe repository). It runs entirely in the
browser; no camera frame is uploaded anywhere.

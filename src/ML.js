import ml5 from "ml5";

document.addEventListener("DOMContentLoaded", setupMl);

function setupMl() {
  var video = document.getElementById("video");
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  ctx.lineWidth = 10;
  ctx.strokeStyle = "green";
  ctx.font = "60px Verdana";
  let counter = 0;
  let brain;

  let pose, skeleton;
  let poseLabel = "QWE";

  let parts = ["leftElbow", "rightElbow", "leftKnee", "rightKnee"];

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream;
        video.play();
      });
  }

  function drawCameraIntoCanvas() {
    // Draw the video element into the canvas
    ctx.drawImage(video, 0, 0, 640, 480);
    // We can call both functions to draw all keypoints and the skeletons
    drawKeypoints();
    drawSkeleton();
    ctx.fillStyle = "red";
    ctx.fillText(poseLabel, 10, 90);
    ctx.fillText(counter, 400, 90);
    window.requestAnimationFrame(drawCameraIntoCanvas);
  }
  const poseNet = ml5.poseNet(
    video,
    {
      architecture: "MobileNetV1",
      detectionType: "single",
      minConfidence: 0.8,
    },
    modelReady
  );
  poseNet.on("pose", gotPoses);

  function gotPoses(poses) {
    if (poses.length > 0) {
      pose = poses[0].pose;
      skeleton = poses[0].skeleton;
    }
  }

  function modelReady() {
    console.log("model ready");
    drawCameraIntoCanvas();
    brain = ml5.neuralNetwork({
      inputs: 8,
      outputs: 2,
      task: "classification",
      debug: true,
    });
    const modelInfo = {
      model: "models/jumping_jacks/model.json",
      metadata: "models/jumping_jacks/model_meta.json",
      weights: "models/jumping_jacks/model.weights.bin",
    };
    brain.load(modelInfo, brainLoaded);
  }

  function brainLoaded() {
    console.log("pose classification ready!");
    classifyPose();
  }

  function classifyPose() {
    if (!pose) return;
    if (parts.every((partName) => pose[partName].confidence > 0.5)) {
      let inputs = pose.keypoints.filter((kp) => parts.includes(kp.part));

      inputs = [
        ...inputs.map((obj) => [obj.position.x, obj.position.x]),
      ].flat();
      console.log(inputs);
      brain.classify(inputs, gotResult);
    } else {
      setTimeout(classifyPose, 100);
    }
  }

  function gotResult(error, results) {
    if (results && results[0].confidence > 0.75) {
      const newPoseLabel = results[0].label.toUpperCase();
      if (newPoseLabel !== poseLabel) {
        poseLabel = newPoseLabel;
        console.log(poseLabel);
        if (poseLabel === "Q") {
          counter++;
          console.log(counter);
          document.getElementById("counter").innerText = counter;
          // jump();
        }
      }
    }
    classifyPose();
  }
  function drawSkeleton() {
    if (!skeleton) return;
    for (let j = 0; j < skeleton.length; j += 1) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];

      ctx.beginPath();
      ctx.moveTo(partA.position.x, partA.position.y);
      ctx.lineTo(partB.position.x, partB.position.y);
      ctx.stroke();
    }
  }
  function drawKeypoints() {
    if (!pose) return;
    for (let j = 0; j < pose.keypoints.length; j += 1) {
      let keypoint = pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 10, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }
}

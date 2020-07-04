import ml5 from "ml5";
import { Actions } from "@andyet/simplewebrtc";
const ROOM_NAME = "jumply";

document.addEventListener("DOMContentLoaded", setupMl);

function setupMl() {
  var video = document.getElementById("videocap");
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  let secondsLeft = 20;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "green";
  ctx.font = "90px Verdana";
  let counter = 0;
  let judge;
  let startSound, eser, audioJungle, tenSeconds, youLost, youWin, counterSound;

  let button = document.getElementById("call");
  let counterInterval;
  let initialShoulder;
  button.addEventListener("click", () => {
    startSound = new sound(process.env.PUBLIC_URL + "sounds/123.mpeg");
    counterSound = new sound(process.env.PUBLIC_URL + "sounds/counter.mp3");
    tenSeconds = new sound(process.env.PUBLIC_URL + "sounds/10sec.mp3");
    youLost = new sound(process.env.PUBLIC_URL + "sounds/you_lost.mp3");
    youWin = new sound(process.env.PUBLIC_URL + "sounds/clap.mp3");
    eser = new sound(process.env.PUBLIC_URL + "sounds/eser.ogg");
    audioJungle = new sound(
      process.env.PUBLIC_URL + "sounds/audio_jungle.mpeg"
    );
    let roomAddress = Object.keys(window.store.getState().simplewebrtc.rooms);
    audioJungle.play();
    console.log(roomAddress);
    if (roomAddress) roomAddress = roomAddress[0];
    console.log(roomAddress);
    Actions.sendChat(roomAddress, { body: "qwe", displayName: "anon" });
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(function (stream) {
          video.srcObject = stream;
          video.play();
        });
    }
  });

  let pose, skeleton;
  let poseLabel = "READY";

  let parts = ["leftElbow", "rightElbow", "leftKnee", "rightKnee"];

  let yogevParts = ["rightShoulder", "leftShoulder", "leftElbow", "rightElbow"];
  let yogevPosition = "READY";
  let yogevDelta = 30;
  let yogevCounter = -1;

  function drawCameraIntoCanvas() {
    // Draw the video element into the canvas
    ctx.drawImage(video, 0, 0, 640, 480);
    // We can call both functions to draw all keypoints and the skeletons
    drawKeypoints();
    drawSkeleton();
    ctx.fillStyle = "pink";
    if (poseLabel === "READY") {
      ctx.fillText(poseLabel, 10, 90);
    } else {
      ctx.fillText(poseLabel === "W" ? "UP" : "DOWN", 10, 90);
    }
    ctx.fillText(counter, 400, 90);
    // ctx.fillText(yogevCounter, 400, 140);
    ctx.fillText(secondsLeft, 90, 440);
    // ctx.fillText(yogevPosition, 90, 140);
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
    drawCameraIntoCanvas();
    judge = ml5.neuralNetwork({
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
    judge.load(modelInfo, judgeReady);
  }

  function judgeReady() {
    classifyPose();
  }

  function classifyPose() {
    if (!pose) return;
    if (parts.every((partName) => pose[partName].confidence > 0.8)) {
      console.log(pose.rightShoulder);
      if (pose.rightShoulder.x > initialShoulder + yogevDelta) {
        yogevPosition = "W";
        yogevCounter++;
        console.log("yogev:W");
      }
      let inputs = pose.keypoints.filter((kp) => parts.includes(kp.part));

      inputs = [
        ...inputs.map((obj) => [obj.position.x, obj.position.x]),
      ].flat();
      judge.classify(inputs, poseClassified);
    } else {
      setTimeout(classifyPose, 100);
    }
  }

  function poseClassified(error, results) {
    if (results && results[0].confidence > 0.8) {
      const newPoseLabel = results[0].label.toUpperCase();
      if (newPoseLabel !== poseLabel) {
        poseLabel = newPoseLabel;
        if (poseLabel === "Q") {
          counter++;
          if (counter === 1) {
            counterInterval = setInterval(() => {
              secondsLeft--;
              if (secondsLeft === 10) tenSeconds.play();
              if (secondsLeft === 0) {
                clearInterval(counterInterval);
                audioJungle.stop();
                if (counter > 15) {
                  youWin.play();
                } else {
                  youLost.play();
                }
              }
            }, 1000);
            audioJungle.setVolume(0.2);
            startSound.play();
            initialShoulder = pose.rightShoulder.x;
            console.log("initialShoulder");
            console.log(initialShoulder);
          }
          if (counter === 10) {
            eser.play();
          }
          counterSound.play();
          // Actions.sendChat(ROOM_NAME, { body: counter });
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

function sound(src, volume = 0.6) {
  try {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.volume = volume;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function () {
      this.sound.play();
    };
    this.stop = function () {
      this.sound.pause();
    };
    this.setVolume = function (vol) {
      this.sound.volume = vol;
    };
  } catch (e) {}
}

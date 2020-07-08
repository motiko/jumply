import ml5 from "ml5";
import { Actions } from "@andyet/simplewebrtc";
// import { jump } from "./virtual";

const ROOM_NAME = "jumply";
const userId = Math.floor(Math.random() * 100);

document.addEventListener("DOMContentLoaded", init);

function init() {
  var video = document.getElementById("videocap");
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  let secondsLeft = 20;
  ctx.font = "90px Verdana";
  let myScore = 0;
  let opponentScore = 0;
  let startSound, eser, audioJungle, tenSeconds, youLost, youWin, counterSound;

  let button = document.getElementById("play");
  let counterInterval;
  let initialShoulder;
  let pose, skeleton;
  let poseLabel = "READY";
  // let parts = ["leftElbow", "rightElbow", "leftKnee", "rightKnee"];

  let initialParts = ["leftElbow", "rightElbow"];
  let parts = ["rightShoulder", "leftShoulder"];
  let jumpDelta = 90;

  let silImg = document.getElementById("silouethe");

  function reset() {
    poseLabel = "READY";
    myScore = 0;
    opponentScore = 0;
    secondsLeft = 20;
    initialShoulder = undefined;
  }

  function loadMusicFiles() {
    startSound = new Audio(process.env.PUBLIC_URL + "sounds/123.mpeg");
    counterSound = new Audio(process.env.PUBLIC_URL + "sounds/counter.mp3");
    tenSeconds = new Audio(process.env.PUBLIC_URL + "sounds/10sec.mp3");
    youLost = new Audio(process.env.PUBLIC_URL + "sounds/you_lost.mp3");
    youWin = new Audio(process.env.PUBLIC_URL + "sounds/clap.mp3");
    eser = new Audio(process.env.PUBLIC_URL + "sounds/eser.ogg");
    audioJungle = new Audio(
      process.env.PUBLIC_URL + "sounds/sport_countdown.mp3"
    );
    audioJungle.volume = 0.7;
  }

  button.addEventListener("click", () => {
    reset();
    button.style.display = "none";
    loadMusicFiles();
    audioJungle.play();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(function (stream) {
          video.srcObject = stream;
          video.play();
        });
    }
    calcOpponentScore();
  });

  function drawCameraIntoCanvas() {
    // Draw the video element into the canvas
    ctx.drawImage(video, 0, 0, 800, 600);
    // We can call both functions to draw all keypoints and the skeletons
    // drawKeypoints();
    drawSkeleton();
    ctx.fillStyle = "pink";
    if (poseLabel === "READY") {
      ctx.fillText("Get into position", 10, 90);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(silImg, 180, 60);
      ctx.globalAlpha = 1;
    } else {
      // ctx.fillText(poseLabel === "W" ? "UP" : "DOWN", 10, 90);
      ctx.fillText("Jump", 10, 90);
    }
    ctx.fillText(`P1: ${myScore}`, 10, 180);
    ctx.fillText(`P2:${opponentScore}`, 10, 270);
    ctx.fillText(`0:${secondsLeft}`, 360, 550);
    window.requestAnimationFrame(drawCameraIntoCanvas);
  }

  const poseNet = ml5.poseNet(
    video,
    {
      architecture: "MobileNetV1",
      detectionType: "single",
      minConfidence: 0.4,
      multiplier: 1.0,
      outputStride: 16,
    },
    modelReady
  );
  poseNet.on("pose", gotPoses);

  function gotPoses(poses) {
    if (poses.length > 0) {
      pose = poses[0].pose;
      skeleton = poses[0].skeleton;
    }
    classifyPose();
  }

  function modelReady() {
    drawCameraIntoCanvas();
    // jump();
    classifyPose();
  }

  function classifyPose() {
    if (pose && parts.every((partName) => pose[partName].confidence > 0.7)) {
      if (
        poseLabel === "READY" &&
        initialParts.every((partName) => pose[partName].confidence > 0.7)
      ) {
        poseLabel = "Q";
        countJump();
      } else if (poseLabel === "Q") {
        if (pose.rightShoulder.y < initialShoulder - jumpDelta) {
          poseLabel = "W";
          countJump();
        }
      } else if (poseLabel === "W") {
        if (pose.rightShoulder.y > initialShoulder - 50) {
          poseLabel = "Q";
        }
      }
    }
  }

  function startSecondsCounter() {
    counterInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft === 10) tenSeconds.play();
      if (secondsLeft === 0) {
        button.style.display = "block";
        clearInterval(counterInterval);
        audioJungle.stop();
        if (myScore > opponentScore) {
          youWin.play();
        } else {
          youLost.play();
        }
      }
    }, 1000);
  }

  function countJump() {
    myScore++;
    sendScore(myScore);
    // jump();
    if (myScore === 1) {
      startSecondsCounter();
      audioJungle.volume = 0.4;
      startSound.play();
      initialShoulder = pose.rightShoulder.y;
    }
    if (myScore === 10) {
      eser.play();
    }
    counterSound.play();
  }
  function calcOpponentScore() {
    const state = window.store.getState().simplewebrtc;
    const opponentScores = Object.values(state.chats).filter(
      (msg) => msg.direction === "incoming"
    );
    let lastScore = opponentScores
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      ?.pop();
    // console.log(lastScore);
    if (lastScore) opponentScore = parseInt(lastScore.body);
    setTimeout(calcOpponentScore, 1000);
  }

  function drawLine(y, color = "red") {
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(200, y);
    ctx.stroke();
  }

  function drawSkeleton() {
    if (!skeleton) return;
    for (let j = 0; j < skeleton.length; j += 1) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      ctx.lineWidth = 10;
      ctx.strokeStyle = "green";

      ctx.beginPath();
      ctx.moveTo(partA.position.x, partA.position.y);
      ctx.lineTo(partB.position.x, partB.position.y);
      ctx.stroke();
    }
    if (initialShoulder) {
      drawLine(initialShoulder, "pink");
      drawLine(initialShoulder - jumpDelta, "orange");
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

function sendScore(score) {
  const state = window.store.getState().simplewebrtc;
  let roomAddress = Object.keys(state.rooms);
  if (roomAddress) roomAddress = roomAddress[0];
  window.store.dispatch(
    Actions.sendChat(roomAddress, {
      body: score,
      displayName: "anon" + userId,
    })
  );
}

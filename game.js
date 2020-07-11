import * as posenet from "@tensorflow-models/posenet";
import "@tensorflow/tfjs-backend-webgl";
import {
  sendInPosition,
  whenOpponentReady,
  sendScore,
  calcOpponentScore,
} from "./communication";
import { loadVideo } from "./video";
// import { jump } from "./virtual";

const videoWidth = 800;
const videoHeight = 600;
const singlePlayer = location.pathname.substr(1) === "single";
const button = document.getElementById("play");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  let secondsLeft = 20;
  let poseLabel = "READY";
  let myScore = 0;
  let opponentScore = 0;
  let startSound, eser, audioJungle, tenSeconds, youLost, youWin, counterSound;
  let counterInterval, initialShoulder, pose, video;
  let initialParts = ["leftKnee", "rightKnee", "leftEye", "rightEye"];
  // let initialParts = ["leftEye", "rightEye"];
  let actionParts = ["rightShoulder", "leftShoulder"];
  let jumpDelta = 90;
  let silImg = document.getElementById("silouethe");
  let gameState = "out_of_position"; // out_of_position | waiting | playing | stoped

  try {
    video = await loadVideo(videoWidth, videoHeight);
  } catch (e) {
    console.error("couldn't capture video");
    console.error(e);
  }

  function reset() {
    poseLabel = "READY";
    gameState = "out_of_position";
    myScore = 0;
    opponentScore = 0;
    secondsLeft = 20;
    initialShoulder = undefined;
  }

  function loadMusicFiles() {
    startSound = new Audio();
    startSound.play();
    startSound.pause();
    startSound.src = require("/sounds/123.mpeg");
    counterSound = new Audio(require("/sounds/counter.mp3"));
    tenSeconds = new Audio(require("/sounds/10sec.mp3"));
    youLost = new Audio(require("/sounds/you_lost.mp3"));
    youWin = new Audio(require("/sounds/clap.mp3"));
    eser = new Audio(require("/sounds/eser.ogg"));
    audioJungle = new Audio(require("/sounds/sport_countdown.mp3"));
    audioJungle.volume = 0.4;
  }

  async function drawCameraIntoCanvas() {
    pose = await poseNet.estimatePoses(video, {
      flipHorizontal: true,
      decodingMethod: "single-person",
    });
    pose = pose[0];

    classifyPose();
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    drawSkeleton();
    ctx.fillStyle = "lightgreen";
    ctx.font = "90px Arcade";
    if (gameState === "out_of_position") {
      ctx.fillText("Get into position", 10, 90);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(silImg, 180, 60);
      ctx.globalAlpha = 1;
    } else if (gameState === "waiting") {
      ctx.fillText("Waiting for opponent", 10, 90);
    } else if (gameState === "countdown") {
      ctx.fillText("Ready", 10, 90);
    } else if (gameState === "playing") {
      // ctx.fillText(poseLabel === "W" ? "UP" : "DOWN", 10, 390);
      ctx.fillText("Jump", 10, 90);
      if (singlePlayer) {
        ctx.fillText(`${myScore}`, 10, 180);
      } else {
        ctx.fillText(`P1: ${myScore}`, 10, 180);
        ctx.fillText(`P2:${opponentScore}`, 10, 270);
      }
      ctx.fillText(`0:${secondsLeft}`, 360, 550);
    }
    window.requestAnimationFrame(drawCameraIntoCanvas);
  }

  const poseNet = await posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: 200,
    multiplier: 0.5,
    quantBytes: 2,
  });

  button.addEventListener("click", () => {
    reset();
    button.style.display = "none";
    loadMusicFiles();
    audioJungle.play();
    if (!singlePlayer) calcOpponentScore();
    drawCameraIntoCanvas();
  });
  button.innerText = "Play";

  function getPart(pose, partName) {
    return pose.keypoints.find((kp) => kp.part === partName);
  }

  function partsMinConfidence(parts, minConfidence) {
    return parts.every(
      (partName) => getPart(pose, partName).score > minConfidence
    );
  }

  function classifyPose() {
    if (pose && partsMinConfidence(actionParts, 0.7)) {
      if (poseLabel === "READY" && partsMinConfidence(initialParts, 0.9)) {
        gameState = "waiting";
        poseLabel = "Q";
        if (!singlePlayer) sendInPosition();
        playerInPosition();
      } else if (poseLabel === "Q") {
        if (
          getPart(pose, "rightShoulder").position.y <
          initialShoulder - jumpDelta
        ) {
          poseLabel = "W";
          countJump();
        }
      } else if (poseLabel === "W") {
        if (getPart(pose, "rightShoulder").position.y > initialShoulder - 50) {
          poseLabel = "Q";
        }
      }
    }
  }

  async function playerInPosition() {
    initialShoulder = getPart(pose, "rightShoulder").position.y;
    if (!singlePlayer) await whenOpponentReady();
    audioJungle.volume = 0.2;
    startSound.play();
    gameState = "countdown";
    setTimeout(startSecondsCounter, 3000);
  }

  function startSecondsCounter() {
    gameState = "playing";
    counterInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft === 10) tenSeconds.play();
      if (secondsLeft === 0) {
        clearInterval(counterInterval);
        gameState = "stoped";
        button.style.display = "block";
        button.innerText = "Rematch";
        audioJungle.pause();
        if (myScore > opponentScore) {
          youWin.play();
          button.innerText += " (You win)";
        } else {
          youLost.play();
          button.innerText += " (You Lost)";
        }
      }
    }, 1000);
  }

  function countJump() {
    myScore++;
    if (!singlePlayer) sendScore(myScore);
    // jump();
    if (myScore === 10) {
      eser.play();
    }
    counterSound.play();
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
    if (initialShoulder) {
      drawLine(initialShoulder, "pink");
      drawLine(initialShoulder - jumpDelta, "orange");
    }
    if (pose) {
      const rightShoulder = getPart(pose, "rightShoulder");
      // console.log(rightShoulder);
      drawLine(rightShoulder.position.y, "green");
    }
  }
}

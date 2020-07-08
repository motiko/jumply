import { Actions } from "@andyet/simplewebrtc";
import * as posenet from "@tensorflow-models/posenet";
import "@tensorflow/tfjs-backend-webgl";
// import { jump } from "./virtual";

const ROOM_NAME = "jumply";
const userId = Math.floor(Math.random() * 100);
const videoWidth = 800;
const videoHeight = 600;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  var video;
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

  try {
    video = await loadVideo();
  } catch (e) {
    console.error("couldn't capture video");
    console.error(e);
  }

  function reset() {
    poseLabel = "READY";
    myScore = 0;
    opponentScore = 0;
    secondsLeft = 20;
    initialShoulder = undefined;
  }

  function loadMusicFiles() {
    startSound = new Audio();
    startSound.play();
    startSound.pause();
    counterSound = new Audio(require("/sounds/counter.mp3"));
    tenSeconds = new Audio(require("/sounds/10sec.mp3"));
    youLost = new Audio(require("/sounds/you_lost.mp3"));
    youWin = new Audio(require("/sounds/clap.mp3"));
    eser = new Audio(require("/sounds/eser.ogg"));
    audioJungle = new Audio(require("/sounds/sport_countdown.mp3"));
    audioJungle.volume = 0.6;
  }

  async function drawCameraIntoCanvas() {
    pose = await poseNet.estimatePoses(video, {
      flipHorizontal: true,
      decodingMethod: "single-person",
    });

    classifyPose();
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    drawSkeleton();
    ctx.fillStyle = "pink";
    if (poseLabel === "READY") {
      ctx.fillText("Get into position", 10, 90);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(silImg, 180, 60);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillText(poseLabel === "W" ? "UP" : "DOWN", 10, 390);
      ctx.fillText("Jump", 10, 90);
    }
    ctx.fillText(`P1: ${myScore}`, 10, 180);
    ctx.fillText(`P2:${opponentScore}`, 10, 270);
    ctx.fillText(`0:${secondsLeft}`, 360, 550);
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
    calcOpponentScore();
    drawCameraIntoCanvas();
  });

  // jump();
  //
  function getPart(pose, partName) {
    return pose.keypoints.find((kp) => kp.part === partName);
  }

  function classifyPose() {
    pose = pose[0];
    if (
      pose &&
      parts.every((partName) => getPart(pose, partName).score > 0.7)
    ) {
      if (
        poseLabel === "READY" &&
        initialParts.every((partName) => getPart(pose, partName).score > 0.7)
      ) {
        poseLabel = "Q";
        countJump();
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

  function startSecondsCounter() {
    counterInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft === 10) tenSeconds.play();
      if (secondsLeft === 0) {
        button.style.display = "block";
        clearInterval(counterInterval);
        audioJungle.pause();
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
      startSound.src = process.env.PUBLIC_URL + "sounds/123.mpeg";
      startSound.play();
      initialShoulder = getPart(pose, "rightShoulder").position.y;
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
    if (initialShoulder) {
      drawLine(initialShoulder, "pink");
      drawLine(initialShoulder - jumpDelta, "orange");
    }
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

async function loadVideo() {
  const video = await setupCamera(videoWidth, videoHeight);
  video.play();

  return video;
}

export async function setupCamera(width, height) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    );
  }

  const video = document.getElementById("video");
  video.width = width;
  video.height = height;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: mobile ? undefined : width,
      height: mobile ? undefined : height,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

export function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

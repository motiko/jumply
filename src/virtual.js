import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ml5 from "ml5";

var container, stats, controls;
var camera, scene, renderer, light, mixer;
let counter = 0;

var jumpingAction;

var clock = new THREE.Clock();

init();
animate();

function init() {
  const containerHeight = window.innerHeight * 0.5;
  const containerWidth = window.innerWidth * 0.25;
  container = document.getElementById("virtual");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    45,
    containerWidth / containerHeight,
    1,
    2000
  );
  camera.position.set(100, 200, 300);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);

  light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 200, 0);
  scene.add(light);

  light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 200, 100);
  light.castShadow = true;
  light.shadow.camera.top = 180;
  light.shadow.camera.bottom = -100;
  light.shadow.camera.left = -120;
  light.shadow.camera.right = 120;
  scene.add(light);

  // scene.add( new CameraHelper( light.shadow.camera ) );

  // ground
  var mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2000, 2000),
    new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  var grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  // model
  var loader = new FBXLoader();
  loader.load(process.env.PUBLIC_URL + "3d/jody_jumping_jacks.fbx", function (
    object
  ) {
    mixer = new THREE.AnimationMixer(object);

    jumpingAction = mixer.clipAction(object.animations[0]);
    jumpingAction.clampWhenFinished = true;
    jumpingAction.setLoop(THREE.LoopPingPong, 4);
    jumpingAction.play();

    object.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(object);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(containerWidth, containerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 100, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize, false);

  // stats
  stats = new Stats();
  container.appendChild(stats.dom);
}

function onWindowResize() {
  const containerHeight = window.innerHeight * 0.5;
  const containerWidth = window.innerWidth * 0.25;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(containerWidth, containerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  var delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);

  stats.update();
}

export function jump(event) {
  if (jumpingAction !== null) {
    jumpingAction.setLoop(THREE.LoopPingPong, 2);
    jumpingAction.stop();
    jumpingAction.play();
  }
}


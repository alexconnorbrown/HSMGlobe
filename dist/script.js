import * as THREE from "https://cdn.skypack.dev/three@0.133.1/build/three.module";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/OrbitControls";
import gsap from "https://cdn.skypack.dev/gsap@3.7.0";

const containerEl = document.querySelector(".globe-wrapper");
const canvas3D = containerEl.querySelector("#globe-3d");
const canvas2D = containerEl.querySelector("#globe-2d-overlay");
const popupEl = containerEl.querySelector(".globe-popup");

let renderer, scene, camera, rayCaster, controls;
let overlayCtx = canvas2D.getContext("2d");
let coordinates2D = [0, 0];
let pointerPos;
let clock, mouse, pointer, globe, globeMesh;
let popupVisible;
let earthTexture, mapMaterial;
let popupOpenTl, popupCloseTl;

let dragged = false;

initScene();
window.addEventListener("resize", updateSize);

function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas: canvas3D, alpha: true });
  renderer.setPixelRatio(4);

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0, 3);
  camera.position.z = 1.1;
  camera.position.x=0;
  camera.position.y=0;

  rayCaster = new THREE.Raycaster();
  rayCaster.far = 1.15;
  mouse = new THREE.Vector2(-1, -1);
  clock = new THREE.Clock();

  createOrbitControls();

  popupVisible = false;

  new THREE.TextureLoader().load(
    "https://ksenia-k.com/img/earth-map-colored.png",
    (mapTex) => {
      earthTexture = mapTex;
      earthTexture.repeat.set(5, 1);
      createGlobe();
      createPointer();
      //createPopupTimelines();
      addCanvasEvents();
      updateSize();
      // Removed addFixedMarkers() call
      render();
    }
  );
}

function createOrbitControls() {
  controls = new OrbitControls(camera, canvas3D);
 controls = new OrbitControls(camera, canvas3D);
  controls.enablePan = false;
  controls.ZoomEnabled = true;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.4 * Math.PI;
  controls.maxPolarAngle = 0.4 * Math.PI;
  controls.autoRotate = true;


  let timestamp;
  controls.addEventListener("start", () => {
    timestamp = Date.now();
  });
  controls.addEventListener("end", () => {
    dragged = Date.now() - timestamp > 200;
  });
}

function createGlobe() {
  const globeGeometry = new THREE.IcosahedronGeometry(1, 55);
  mapMaterial = new THREE.ShaderMaterial({
    vertexShader: document.getElementById("vertex-shader-map").textContent,
    fragmentShader: document.getElementById("fragment-shader-map").textContent,
    uniforms: {
      u_map_tex: { type: "t", value: earthTexture },
      u_dot_size: { type: "v3", value: 1},
      u_pointer_size: { type: "v3", value: 0},
      u_time_since_click: { value: 0 },
    },
    alphaTest: false,
    transparent: true,
  });

  globe = new THREE.Points(globeGeometry, mapMaterial);
  scene.add(globe);

  globeMesh = new THREE.Mesh(
    globeGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.05,
    })
  );
  scene.add(globeMesh);
}

function createPointer() {
  const geometry = new THREE.SphereGeometry(0.00, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0xAC0000,
    transparent: true,
    opacity: 0,
  });
  pointer = new THREE.Mesh(geometry, material);
  scene.add(pointer);
}

function addCanvasEvents() {
  containerEl.addEventListener("mousemove", (e) => {
    updateMousePosition(e.clientX, e.clientY);
  });

  containerEl.addEventListener("click", (e) => {
    if (!dragged) {
      updateMousePosition(
        e.targetTouches ? e.targetTouches[0].pageX : e.clientX,
        e.targetTouches ? e.targetTouches[0].pageY : e.clientY
      );

      const res = checkIntersects();
      if (res.length) {
        pointerPos = res[0].face.normal.clone();
        pointer.position.set(
          res[0].face.normal.x,
          res[0].face.normal.y,
          res[0].face.normal.z
        );
        
        
        mapMaterial.uniforms.u_pointer.value = res[0].face.normal;
        popupEl.innerHTML = cartesianToLatLong();
        showPopupAnimation(true);
        clock.start();      
      }
    }
  });

  function updateMousePosition(eX, eY) {
    mouse.x = (eX - containerEl.offsetLeft) / containerEl.offsetWidth * 2 - 1;
    mouse.y = -((eY - containerEl.offsetTop) / containerEl.offsetHeight) * 2 + 1;
  }
}

function checkIntersects() {
  rayCaster.setFromCamera(mouse, camera);
  const intersects = rayCaster.intersectObject(globeMesh);
  document.body.style.cursor = intersects.length ? "pointer" : "auto";
  return intersects;
}

function render() {
  mapMaterial.uniforms.u_time_since_click.value = clock.getElapsedTime();
  checkIntersects();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function updateSize() {
  const minSide = (window.innerWidth, window.innerHeight);
  containerEl.style.width = minSide + "px";
  containerEl.style.height = minSide + "px";
  renderer.setSize(minSide, window.innerHeight);
  canvas2D.width = canvas2D.height = minSide;
  mapMaterial.uniforms.u_dot_size.value = 0.02 * minSide;
}

// HELPERS

function cartesianToLatLong() {
  const pos = pointer.position;
  const lat = 90 - Math.acos(pos.y) * 180 / Math.PI;
  const lng = (270 + Math.atan2(pos.x, pos.z) * 180 / Math.PI) % 360 - 180;
  return formatCoordinate(lat, "N", "S") + ",&nbsp;" + formatCoordinate(lng, "E", "W");
}

function formatCoordinate(coordinate, positiveDirection, negativeDirection) {
  const direction = coordinate >= 0 ? positiveDirection : negativeDirection;
  return `${Math.abs(coordinate).toFixed(4)}°&nbsp${direction}`;
}

function createPopupTimelines() {
  // Popup animations remain unchanged
}

function showPopupAnimation(lifted) {
  // Popup show/hide logic remains unchanged
}

function drawPopupConnector(startX, startY, midX, midY, endX, endY) {
  // Popup connector drawing logic remains unchanged
}
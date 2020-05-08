
// bind '$' to querySelctor
let $ = document.querySelector.bind(document);

let playerHeight = 20;

let canvas = $("#renderCanvas");               // Get the canvas element
let engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
let scene = createScene();
// scene.debugLayer.show();

// ----------------------------------------------------------------------------

function createScene() {
  let scene = new BABYLON.Scene(engine);

  // Add a camera to the scene and attach it to the canvas
  let camPos = new BABYLON.Vector3(0, playerHeight, 0);
  let camera = new BABYLON.FreeCamera("camera", camPos, scene);
  camera.fov = 0.9;

  // distance to render scaled model
  camera.maxZ = 1000;

  // negative to invert control (natural scrolling)
  camera.angularSensibility = -2000;
  camera.attachControl(canvas, true);

  let url = "https://raw.githubusercontent.com/TeleXRobotics/MuseumDemo/master/asset/Models/Scene/";
  let fileName = "scene.gltf";
    
  BABYLON.SceneLoader.ImportMesh("", url, fileName, scene, renderMesh, updateSplash);
  return scene;
};

// ----------------------------------------------------------------------------

function renderMesh(newMeshes) {
  scene.activeCamera.target = newMeshes[0];

  // scale imported mesh
  newMeshes[0].scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
  // set sky off-white
  scene.clearColor = new BABYLON.Color3(1.0, 0.95, 0.9);
  initCylinderEnvironment(scene);
  scene.createDefaultLight();
  makeLocations();
  // move to initial location from url if present
  window.onhashchange();

  // let light = new BABYLON.SpotLight("light", new BABYLON.Vector3(74, 40, -67), new BABYLON.Vector3(0, -1, 0), Math.PI / 2, 50, scene);
  // light.diffuse = new BABYLON.Color3(1, .9, .5);
  // light.specular = new BABYLON.Color3(1, .9, .5);
  // light.intensity = 40000;

  hideSplash();
}

// ----------------------------------------------------------------------------

function hideSplash() {
  $("#splashScreen").style.display = "none";
}

function loadPercent(event) {
  if (event.lengthComputable) {
    return (event.loaded * 100 / event.total).toFixed();
  }

  dlCount = event.loaded / (1024 * 1024);
  return Math.floor(dlCount * 100.0) / 100.0;
}

function updateSplash(event) {
  $("#loadPercent").innerText = loadPercent(event);
}

// ----------------------------------------------------------------------------

// approximate, close enough
let radius = 138;
let centerX = -31;
let centerZ = 16;

// make invisible wall to handle player collisions
function initCylinderEnvironment(scene) {
  // create walls
  let opts = {
    height: 50,
    diameter: radius * 2,
    sideOrientation: BABYLON.Mesh.BACKSIDE,
  };

  let wall = BABYLON.MeshBuilder.CreateCylinder("wall", opts, scene);

  wall.material = new BABYLON.StandardMaterial('groundMat', scene);
  wall.position = new BABYLON.Vector3(centerX, 0, centerZ);

  wall.material.alpha = 0.0;
  wall.checkCollisions = true;
  scene.collisionsEnabled = true;
  scene.activeCamera.checkCollisions = true;
}

// ----------------------------------------------------------------------------

function getRadVect(theta, offset) {
  let x = centerX + (radius - offset) * Math.sin(theta);
  let z = centerZ + (radius - offset) * Math.cos(theta);
  return {x, z};
}

function makeLoc(title, pos, theta) {
  return {title, pos, theta, text: ""};
}

let locations = [];

function makeLocations() {
  let index = 0;

  for (let theta = 0; theta < 2 * Math.PI; theta += 2 * Math.PI / 7) {
    locations.push(makeLoc("Item " + index++, getRadVect(theta, 80), theta));
    // add theta to pi to face inward
    locations.push(makeLoc("Item " + index++, getRadVect(theta, 0), Math.PI + theta));
    locations.push(makeLoc("Item " + index++, getRadVect(theta + Math.PI / 7, 40), theta + Math.PI / 7));
  }

  for (let loc of locations) {
    $("#links").innerHTML += getLinkLoc(loc);
  }

  // for testing
  for (let loc of locations) {
    loc.text = `茵茵，你最好现在离开纽约。 那地方是死亡之谷。 这种流行病太严重了，无法预防。 与您的家人联系，并尝试离开并立即回家。 俗话说，比自己安全更重要的是，不要听老人的话，在面前受苦。 永远不要留在纽约！`
  }
}

function getDist(loc) {
  let dx = loc.pos.x - scene.activeCamera.position.x;
  let dz = loc.pos.z - scene.activeCamera.position.z;
  return Math.sqrt(dx ** 2 + dz ** 2);
}

function nearestLoc() {
  let nearest = locations[0];
  let dist = getDist(locations[0]);

  for (let loc of locations) {
    if (getDist(loc) < dist) {
      dist = getDist(loc);
      nearest = loc;
    }
  }

  return [nearest, dist];
}

function getLinkLoc(loc) {
  return `<a href="#${loc.title}">${loc.title}</a>`;
}

// ----------------------------------------------------------------------------

let drag = false;
let initY;
let deltaY;

scene.onPointerObservable.add((pointerInfo) => {
  switch (pointerInfo.type) {
    case BABYLON.PointerEventTypes.POINTERDOWN:
      drag = true;
      initY = pointerInfo.event.y;
      deltaY = 0;
      break;

    case BABYLON.PointerEventTypes.POINTERUP:
      drag = false;
      break;

    case BABYLON.PointerEventTypes.POINTERMOVE:
      deltaY = pointerInfo.event.y - initY;
      break;
  }
});

function processDrag() {
  // process up/down drag as forward/backward motion
  if (drag) {
    forward = BABYLON.Vector3.TransformCoordinates(
      new BABYLON.Vector3(0, 0, .001 * deltaY),
      BABYLON.Matrix.RotationY(scene.activeCamera.rotation.y),
    );
    scene.activeCamera.cameraDirection.addInPlace(forward);
  }
}

// ----------------------------------------------------------------------------

let currentLoc;

function showNearLoc() {
  let [loc, dist] = nearestLoc();
  let threshold = 15;

  if (dist < threshold) {
    if (loc != currentLoc) {
      currentLoc = loc;
      // toggle pointerEvents instead of display to allow opacity transitions
      $("#info").style.pointerEvents = "auto";
      $("#info").style.opacity = 1;
      $("#infoTitle").innerText = loc.title;
      $("#infoText").innerText = loc.text;
    }

  } else {
    currentLoc = null;
    $("#info").style.pointerEvents = "none";
    $("#info").style.opacity = 0;
  }
}

// ----------------------------------------------------------------------------

scene.registerBeforeRender(function () {
  // prevent vertical movement
  scene.activeCamera.position.y = 20;
  // prevent up-down camera rotation
  scene.activeCamera.rotation.x = 0;

  processDrag();
  if (locations.length > 0) {
    showNearLoc();
  }
});

// ----------------------------------------------------------------------------

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
  scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
  engine.resize();
});

function matchingLoc(title) {
  for (let loc of locations) {
    if (loc.title == title) {
      return loc;
    }
  }
  return null;
}

function moveToLoc(loc, title) {
  if (loc == null) {
    console.log(`no location matching title: "${title}"`);
    return;
  }

  scene.activeCamera.position.x = loc.pos.x;
  scene.activeCamera.position.z = loc.pos.z;
  scene.activeCamera.rotation.y = loc.theta;
}

window.onhashchange = function() { 
  let title = decodeURI(window.location.hash.substr(1));
  let loc = matchingLoc(title);
  moveToLoc(loc, title);
}

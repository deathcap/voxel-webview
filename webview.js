'use strict';

var mat4 = require('gl-mat4');
var matrixToCSS = require('matrix-to-css');
window.mat4=mat4;//debug
//var loadCSS3DRenderer = require('./CSS3DRenderer.js');

module.exports = function(game, opts) {
  return new WebviewPlugin(game, opts);
};

module.exports.pluginInfo = {
  loadAfter: ['voxel-commands', 'voxel-shader']
};

function WebviewPlugin(game, opts)
{
  this.game = game;

  this.shader = game.plugins.get('voxel-shader');
  if (!this.shader) throw new Error('voxel-webview requires voxel-shader plugin');

  this.url = opts.url || 'http://browserify.org/';
  //this.url = opts.url || 'http://npmjs.org/'; // added X-Frame-Options: deny after security audit
  //this.url = opts.url || 'http://learningthreejs.com/'; // hits illegal return in embedded video player??
  //this.url = opts.url || 'https://news.ycombinator.com/'; // refuses to display since X-Frame-Options: DENY
  //this.url = opts.url || 'http://voxeljs.com/'; // also has embedded youtube video player
  //this.url = opts.url || 'http:/aol.com/'; // fails setting aol_devil_flag Uncaught SecurityError: Blocked a frame with origin "http://www.aol.com
  //this.url = opts.url || 'http://github.com/'; // also has X-Frame-Options: deny

  this.planeWidth = opts.planeWidth || 10;
  this.planeHeight = opts.planeHeight || 10;
  this.elementWidth = opts.elementWidth || 1024;

  this.element = undefined;
  this.matrix = mat4.create();
  this.viewMatrix = mat4.create();
  this.modelMatrix = mat4.create();

  this.enable();
}

WebviewPlugin.prototype.enable = function() {
  /*
  var THREE = this.game.THREE;

  loadCSS3DRenderer(THREE); // adds CSS3DObject, CSS3DSprite, CSS3DRenderer to THREE

  // see http://learningthreejs.com/blog/2013/04/30/closing-the-gap-between-html-and-webgl/
  // and https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/CSS3D.html
  var planeMaterial = new THREE.MeshBasicMaterial({color: 0x000000, opacity: 0.1, side: THREE.DoubleSide});
  var planeGeometry = new THREE.PlaneGeometry(this.planeWidth, this.planeHeight);
  var planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  planeMesh.position.y += this.planeHeight / 2;

  // add to the WebGL scene
  this.game.scene.add(planeMesh);

  // create a new scene to hold CSS
  var sceneCSS = new THREE.Scene();
*/

  var element = document.createElement('iframe');
  element.setAttribute('id', 'voxel-webview');
  element.src = this.url;
  var aspectRatio = this.planeHeight / this.planeWidth;
  var elementHeight = this.elementWidth * aspectRatio;
  element.style.width = this.elementWidth + 'px';
  element.style.height = elementHeight + 'px';
  element.style.position = 'absolute'; // display over WebGL canvas
  element.style.transformStyle = 'preserve-3d';

  // CSS world container (3D initialized in updatePerspective)
  var cssWorld = document.createElement('div');

  this.shader.on('updateProjectionMatrix', this.onUpdatePerspective = this.updatePerspective.bind(this));

  this.cssWorld = cssWorld;
  this.element = element;

  this.updateCSSTransform();

  cssWorld.appendChild(element);
  document.body.appendChild(cssWorld);

  this.game.shell.on('gl-render', this.onRender = this.render.bind(this));

/*
  var cssObject = new THREE.CSS3DObject(element);
  cssObject.position = planeMesh.position;
  cssObject.rotation = planeMesh.rotation;
  var percentBorder = 0.05;
  cssObject.scale.x /= (1 + percentBorder) * (this.elementWidth / this.planeWidth);
  cssObject.scale.y /= (1 + percentBorder) * (this.elementWidth / this.planeWidth);
  sceneCSS.add(cssObject);

  var rendererCSS = new THREE.CSS3DRenderer();
  rendererCSS.setSize(window.innerWidth, window.innerHeight);
  rendererCSS.domElement.style.position = 'absolute';
  rendererCSS.domElement.style.top = '0';
  rendererCSS.domElement.style.margin = '0';
  rendererCSS.domElement.style.padding = '0';
  document.body.appendChild(rendererCSS.domElement);
  //THREEx.WindowResize(rendererCSS, camera);

  // make sure the CSS renderer appears below the WebGL renderer
  var rendererWebGL = this.game.view.renderer;
  rendererCSS.domElement.style.zIndex = -1;
  //rendererCSS.domElement.appendChild(this.game.view.renderer.domElement);
  console.log('rendererCSS',rendererCSS);

  var sceneWebGL = this.game.scene;
  var camera = this.game.view.camera;

  var renderWebGL = this.game.view.render.bind(this.game.view);
  this.game.view.render = function(sceneWebGL) {
    rendererCSS.render(sceneCSS, camera);
    //rendererWebGL.render(sceneWebGL, camera);
    renderWebGL(sceneWebGL);
  };
  this.originalRender = renderWebGL;
*/

  var self = this;

  window.addEventListener('click', this.onClick = function(ev) {
    // click anywhere outside of iframe to exit TODO: what if it fills the entire screen? (alternate escape hatch)
    // (we won't receive click events for the iframe here)
    // TODO: register on WebGL canvas element instead?
    //  tried this.game.view.renderer.domElement but didn't receive events
    
    if (document.getElementById('voxel-webview').parentElement.parentElement.style.zIndex === '0') {
      document.getElementById('voxel-webview').parentElement.parentElement.style.zIndex = '-1';
      self.game.interact.request();
    }
  });

  // commands for interacting TODO: replace with something in-game (survival), https://github.com/deathcap/voxel-webview/issues/3
  var commands = this.game.plugins.get('voxel-commands');
  if (commands) {
    commands.registerCommand('url',
        this.onURL = function(address) {
          if (!address || address.length === 0) {
            address = window.location.origin; // load self
          }

          if (address.indexOf('://') === -1) {
            address = 'http://' + address; // so example.com doesn't load relative path
          }

          document.getElementById('voxel-webview').src = address; // TODO: set url through .url setter?
        },
        'address',
        'loads URL into webview');

    commands.registerCommand('web',
        this.onWeb = function() {
          var z = document.getElementById('voxel-webview').parentElement.parentElement.style.zIndex;
          document.getElementById('voxel-webview').parentElement.parentElement.style.zIndex = {'-1':0, 0:-1}[z];
        },
        '',
        'interact with a webview');
  }
};

WebviewPlugin.prototype.disable = function() {
  //this.game.view.render = this.originalRender;
  window.removeEventListener('click', this.onClick);

  var commands = this.game.plugins.get('voxel-commands');
  if (commands) {
    commands.unregisterCommand('url', this.onURL);
    commands.unregisterCommand('web', this.onWeb);
  }

  this.game.shell.removeListener('gl-render', this.onRender);
  this.shader.removeListener('updateProjectionMatrix', this.onUpdatePerspective);
};

WebviewPlugin.prototype.updatePerspective = function() {
  // http://www.emagix.net/academic/mscs-project/item/camera-sync-with-css3-and-webgl-threejs
  var cameraFOV = this.shader.cameraFOV;
  var screenHeight = this.game.shell.height;
  this.screenWhalf = this.game.shell.width / 2;
  this.screenHhalf = this.game.shell.height / 2;

  this.fovPx = 0.5 / Math.tan(cameraFOV * Math.PI / 360) * screenHeight;
  this.cssWorld.style.perspective = this.fovPx + 'px';
  this.cssWorld.style.perspectiveOrigin = '50% 50%';
};

WebviewPlugin.prototype.updateCSSTransform = function() {
  this.element.style.transform =
    'translate3d(0,0,' + this.fovPx + 'px) ' +
    matrixToCSS(this.matrix) +
    ' translate3d(' + this.screenWhalf + 'px,' + this.screenHhalf + 'px, 0)';
};

WebviewPlugin.prototype.render = function() {
  // matrix = projection * view * model
  mat4.multiply(this.matrix, this.shader.projectionMatrix, this.shader.viewMatrix);
  mat4.multiply(this.matrix, this.matrix, this.modelMatrix);
  // invert world matrix
  mat4.invert(this.matrix, this.matrix);

  this.updateCSSTransform();
};

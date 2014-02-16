'use strict';

var loadCSS3DRenderer = require('./CSS3DRenderer.js');

module.exports = function(game, opts) {
  return new WebviewPlugin(game, opts);
};

function WebviewPlugin(game, opts)
{
  this.game = game;

  this.url = opts.url || 'http://npmjs.org/';
  //this.url = opts.url || 'http://learningthreejs.com/'; // hits illegal return in embedded video player??
  //this.url = opts.url || 'https://news.ycombinator.com/'; // refuses to display since X-Frame-Options: DENY
  //this.url = opts.url || 'http://voxeljs.com/'; // also has embedded youtube video player

  this.planeWidth = opts.planeWidth || 10;
  this.planeHeight = opts.planeHeight || 10;
  this.elementWidth = opts.elementWidth || 1024;

  this.enable();
}

WebviewPlugin.prototype.enable = function() {
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

  var element = document.createElement('iframe');
  element.src = this.url;
  var aspectRatio = this.planeHeight / this.planeWidth;
  var elementHeight = this.elementWidth * aspectRatio;
  element.style.width = this.elementWidth + 'px';
  element.style.height = elementHeight + 'px';

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
};

WebviewPlugin.prototype.disable = function() {
  this.game.view.render = this.originalRender;
};


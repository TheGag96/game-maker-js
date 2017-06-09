var canvas, context;
var entityList = [];

function main() {
  canvas = document.getElementById("field");
  context = canvas.getContext("2d");

  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  
  canvas.addEventListener("mousedown", canvasMouseDown, false);
  canvas.addEventListener("mouseup", canvasMouseUp, false);
  canvas.addEventListener("mousemove", canvasMouseMove, false);
  setInterval(updateCanvas, 16);


  var someBox = new BaseEntity();
  someBox.x = 5;
  someBox.y = 2;
  someBox.width = 200;
  someBox.height = 100;
  someBox.color = "#FF0000";

  var anotherbox = new BaseEntity();
  anotherbox.x = 100;
  anotherbox.y = 2;
  anotherbox.width = 200;
  anotherbox.height = 100;
  anotherbox.color = "#0000FF";

  entityList.push(someBox);
  entityList.push(anotherbox);
}

function updateCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  // console.log(entityList);

  for (var i = 0; i < entityList.length; i++) {
    entityList[i].draw();
  }
}

var wasClicked = false;

function canvasMouseDown(event) {
  mouse = {x: event.pageX, y: event.pageY};

  // if (!wasClicked) {
    for (var i = 0; i < entityList.length; i++) {
      if (pointInBox(mouse, entityList[i])) {
        dragging = entityList[i];
        lastPos = mouse;
      }
    }
  // }

  wasClicked = true;
  lastPos = mouse;
}

function canvasMouseUp(event) {
  dragging = false;
  wasClicked = false;
}

var lastPos = null;
var dragging = false;
function canvasMouseMove(event) {
  mouse = {x: event.clientX, y: event.clientY};

  if (dragging) {
    dragging.x += mouse.x - lastPos.x;
    dragging.y += mouse.y - lastPos.y;
  }

  lastPos = mouse;
}

function pointInBox(point, box) {
  return point.x > box.x && point.x < box.x+box.width && point.y > box.y && point.y < box.y+box.height;
}

function boxIntersection(a, b) {
  return (a.x < b.x+b.width && a.x+a.width > b.x) && (a.y < b.y+b.height && a.y+a.height > b.y);
}

var BaseEntity = function() {
  this.name = "";
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
  this.color = "#000000";
};

BaseEntity.prototype.draw = function() {
  context.fillStyle = this.color;
  context.fillRect(this.x, this.y, this.width, this.height);
};

BaseEntity.prototype.update = function() {

};

BaseEntity.prototype.onCollision = function() {

};

BaseEntity.prototype.onGameStart = function() {

};

window.onload = main;

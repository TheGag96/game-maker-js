define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Editor = (function () {
        function Editor(canvas) {
            //holds the entities viewable when editing
            this.entityList = [];
            //set to the current entity being dragged, false otherwise
            this.dragging = null;
            //set to the currently selected entity, false otherwise
            this.selected = null;
            //last position of the mouse {x, y}
            this.lastMouse = null;
            this.canvas = canvas;
            this.drawContext = canvas.getContext("2d");
        }
        Editor.prototype.step = function () {
            //draw all entities as well as a translucent box around them
            for (var _i = 0, _a = this.entityList; _i < _a.length; _i++) {
                var ent = _a[_i];
                ent.__draw(this.drawContext);
                this.drawContext.beginPath();
                this.drawContext.strokeStyle = "rgba(0,0,0,0.5)";
                this.drawContext.lineWidth = 2;
                this.drawContext.rect(ent.x - 1, ent.y - 1, ent.width + 2, ent.height + 2);
                this.drawContext.stroke();
            }
            //draw a gold outline around the selected entity on top of everything for visibility
            if (this.selected) {
                this.drawContext.beginPath();
                this.drawContext.strokeStyle = "#FFD700";
                this.drawContext.lineWidth = 2;
                this.drawContext.rect(this.selected.x - 1, this.selected.y - 1, this.selected.width + 2, this.selected.height + 2);
                this.drawContext.stroke();
            }
        };
        /**
         * Handle mouse down events:
         *   - Selecting an entity
         *   - Beginning to drag an entity
         **/
        Editor.prototype.onMouseDown = function (event) {
            var mouse = { x: event.pageX, y: event.pageY };
            this.selected = null;
            //check through every entity and see if we're clicking on it
            for (var i = this.entityList.length - 1; i >= 0; i--) {
                if (this.pointInBox(mouse, this.entityList[i])) {
                    this.dragging = this.entityList[i];
                    this.lastMouse = mouse;
                    this.selected = this.entityList[i];
                    break;
                }
            }
            //save last mouse position so that it can be used to detect dragging
            this.lastMouse = mouse;
        };
        /**
         * If the user releases the mouse, they are no longer dragging an entity
         **/
        Editor.prototype.onMouseUp = function (event) {
            this.dragging = null;
        };
        /**
         * At the moment, this hook only handles dragging entities around the canvas.
         **/
        Editor.prototype.onMouseMove = function (event) {
            var mouse = { x: event.clientX, y: event.clientY };
            if (this.dragging) {
                this.dragging.x += mouse.x - this.lastMouse.x;
                this.dragging.y += mouse.y - this.lastMouse.y;
            }
            this.lastMouse = mouse;
        };
        /**
         * Returns true if a point {x, y} is inside (but not on the edge of) a box {x, y, width, height}
         **/
        Editor.prototype.pointInBox = function (point, box) {
            return point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.height;
        };
        return Editor;
    }());
    exports.Editor = Editor;
});

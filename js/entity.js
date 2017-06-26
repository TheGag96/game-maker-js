define(["require", "exports", "./collision"], function (require, exports, collision_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Class describing the most basic Entity that can be used with the game engine
     **/
    var Entity = (function () {
        /**
         * Default constructor. Generates a new unique GUID for the instance.
         **/
        function Entity() {
            //user-defined entity name
            this.name = "";
            //position
            this.x = 0;
            this.y = 0;
            //size
            this.width = 25;
            this.height = 25;
            //velocity
            this.velX = 0;
            this.velY = 0;
            //color the entity will be drawn
            this.color = "rgba(0, 0, 0, 1)";
            //higher means it will be drawn on top of other objects
            this.priority = 1;
            //whether or not the entity is being blocked by another (should be set manually through collision)
            this.blockedUp = false;
            this.blockedDown = false;
            this.blockedLeft = false;
            this.blockedRight = false;
            //stores the previous position (note: in __onUpdate(), these will be the same as x and y)
            this.prevX = 0;
            this.prevY = 0;
            //whether or not to check collisions for this entity
            this.collides = true;
            //internal flag for removing this entity at/after the next __onUpdate()
            this.__removeFlag = false;
            this.__guid = this.__generateGUID();
            this.__collisionBounds = { type: collision_1.CollisionType.rectangle };
        }
        /**
         * Sets an entity's remove flag. Will be removed before or after the entity updates next
         **/
        Entity.prototype.remove = function () {
            this.__removeFlag = true;
        };
        /**
         * Returns whether or not an entity is removed from the game world
         **/
        Entity.prototype.isRemoved = function () {
            return this.__removeFlag;
        };
        /**
         * Creates a copy of the entity.
         * Object members are attempted to be copied by JSON.parse(JSON.stringify(obj)).
         **/
        Entity.prototype.duplicate = function () {
            var result = new Entity();
            for (var key in this) {
                if (typeof this[key] == "object") {
                    var objCopy = JSON.parse(JSON.stringify(this[key]));
                    result[key] = objCopy;
                }
                else
                    result[key] = this[key];
            }
            return result;
        };
        Entity.prototype.__onGameStart = function (event) { };
        Entity.prototype.__onUpdate = function (event) { };
        Entity.prototype.__onCollision = function (event) { };
        Entity.prototype.__draw = function (drawContext) {
            drawContext.fillStyle = this.color;
            drawContext.fillRect(this.x, this.y, this.width, this.height);
        };
        /**
         * Recalculates the bounds that an entity will use for collision detection.
         * Ran during collision checks as well as right after a collision is made
         **/
        Entity.prototype.__recalculateCollisionBounds = function (compVars) {
            if (!this.collides)
                return null;
            var rectBounds = this.__collisionBounds;
            var comp = compVars.comp;
            var prevComp = compVars.prevComp;
            var velComp = compVars.velComp;
            var sizeComp = compVars.sizeComp;
            var dirs = compVars.dirs;
            //set up custom bounding boxes using previous and current positions to account for high entity speeds
            var bbox = {
                type: collision_1.CollisionType.rectangle,
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height
            };
            rectBounds.x = this.x;
            rectBounds.y = this.y;
            rectBounds.width = this.width;
            rectBounds.height = this.height;
            rectBounds[comp] = Math.min(this[comp], this[prevComp]);
            rectBounds[sizeComp] = Math.abs(this[prevComp] - this[comp]) + this[sizeComp];
        };
        /**
         * Retrieves the collision bounds for this entity
         */
        Entity.prototype.__getCollisionBounds = function () { return this.__collisionBounds; };
        /**
         * Generate a pseudo GUID randomly (not guaranteed to be unique). Thanks guid.us!
         **/
        Entity.prototype.__generateGUID = function () {
            function S4() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            }
            return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
        };
        return Entity;
    }());
    exports.Entity = Entity;
});

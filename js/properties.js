define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ko = require("knockout");
    var PropertiesViewModel = (function () {
        function PropertiesViewModel() {
            this.props = ko.observableArray([]);
            this.selected = null;
        }
        PropertiesViewModel.prototype.selectEntity = function (ent) {
            this.selected = ent;
            var newArr = [];
            for (var key in ent) {
                if (typeof ent[key] === "function" || key.substring(0, 2) === "__")
                    continue;
                var newObserve = { name: key, stuff: ko.observable(ent[key]) };
                newArr.push(newObserve);
                var self = this;
                newObserve.stuff.subscribe(function (newVal) {
                    if (!self.setPropWithType(this.name, newVal)) {
                        this.stuff(self.selected[this.name]);
                    }
                }, newObserve);
            }
            this.props(newArr);
        };
        ;
        PropertiesViewModel.prototype.setPropWithType = function (key, value) {
            if (typeof this.selected[key] === "number") {
                var toNum = +value;
                if (!isNaN(toNum)) {
                    this.selected[key] = toNum;
                    return true;
                }
                return false;
            }
            else if (typeof this.selected[key] === "boolean") {
                var toBoolStr = value.trim().toLowerCase();
                this.selected[key] = toBoolStr == "true" || toBoolStr == "1";
            }
            else {
                this.selected[key] = value;
            }
            return true;
        };
        PropertiesViewModel.prototype.updateProperties = function () {
            for (var _i = 0, _a = this.props(); _i < _a.length; _i++) {
                var prop = _a[_i];
                prop.stuff(this.selected[prop.name]);
            }
        };
        return PropertiesViewModel;
    }());
    exports.PropertiesViewModel = PropertiesViewModel;
    ;
});

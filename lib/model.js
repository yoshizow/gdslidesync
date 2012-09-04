/*
 * Copyright(c) 2012 yoshizow
 * MIT Licensed
 */

var RoomList = function() {
    this.initialize.apply(this, arguments);
};

RoomList.prototype = {
    initialize: function() {
        this.list = [];
    },

    getAllRooms: function() {
        return this.list.filter(function(e) { return true; });
    },

    getRoomById: function(id) {
        return this.list[id];
    },

    addRoom: function(url, passCode) {
        var room = this._getRoomByValues(url, passCode);
        if (room) {
            return room;
        } else {
            var id = this._unusedId();
            room = new Room(id, url, passCode);
            this.list[id] = room;
            return room;
        }
    },

    _getRoomByValues: function(url, passCode) {
        var found = null;
        this.list.some(function (room) {
            if (room.url == url && room.passCode == passCode) {
                found = room;
                return true;
            }
        });
        return found;
    },

    _unusedId: function() {
        for (var i = 1; ; i++) {
            if (!(i in this.list)) {
                return i;
            }
        }
        throw new Error();
    }
};

var Room = function() {
    this.initialize.apply(this, arguments);
};

Room.prototype = {
    initialize: function(id, url, passCode) {
        this.id = id;
        this.url = url;
        this.passCode = passCode;
    }
};

exports.RoomList = RoomList;
exports.Room = Room;

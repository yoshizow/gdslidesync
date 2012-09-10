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
        return this.list;
    },

    getRoomById: function(id) {
        var found = null;
        this.list.some(function(room) {
            if (room.id == id) {
                found = room;
                return true;
            }
        });
        return found;
    },

    addRoom: function(url, passCode) {
        var room = this._getRoomByValues(url, passCode);
        if (room) {
            return room;
        } else {
            var id = this._uniqueId();
            room = new Room(id, url, passCode);
            this.list.push(room);
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

    _uniqueId: function() {
        var buf = new Buffer(8);
        buf.writeInt32BE(new Date().getTime() & 0xffffffff, 0);
        buf.writeUInt32BE(Math.random() * 0x100000000, 4);
        return buf.toString('hex');
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

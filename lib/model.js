/*
 * Copyright(c) 2012 yoshizow
 * MIT Licensed
 */

var assert = require('assert');

var RoomList = function() {
    this.initialize.apply(this, arguments);
};

// TODO: limit size (or improve algorithm)
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

    deleteRoomById: function(id) {
        var self = this;
        this.list.some(function(room, index) {
            if (room.id == id) {
                room.isDeleted = true;
                self.list.splice(index, 1);
                return true;
            }
        });
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
        buf.writeInt32BE((new Date().getTime() & 0xffffffff) ^ (Math.random() * 0x100000000), 0);
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
        this.isDeleted = false;
    }
};

var RoomSweeper = function() {
    this.initialize.apply(this, arguments);
}

RoomSweeper.prototype = {
    initialize: function(roomList, timeoutSec) {
        this.roomList = roomList;
        this.timeoutSec = timeoutSec;
        this.activityList = {};
    },

    addRoom: function(room) {
        this.activityList[room.id] = {
            addTime: new Date().getTime(),
            lastLeaveTime: 0,
            isEntered: false
        };
    },

    enterPresenter: function(room) {
        assert.ok(this.activityList[room.id]);
        this.activityList[room.id].isEntered = true;
    },

    leavePresenter: function(room) {
        assert.ok(this.activityList[room.id]);
        this.activityList[room.id].isEntered = false;
        this.activityList[room.id].lastLeaveTime = new Date().getTime();
    },

    sweep: function() {
        var expiryTime = new Date().getTime() - this.timeoutSec * 1000;
        for (id in this.activityList) {
            var activity = this.activityList[id];
            if (activity.addTime < expiryTime &&
                !activity.isEntered &&
                activity.lastLeaveTime < expiryTime) {
                delete this.activityList[id];
                this.roomList.deleteRoomById(id);
                console.log("Expired room " + id);
            }
        }
    }
};

exports.RoomList = RoomList;
exports.Room = Room;
exports.RoomSweeper = RoomSweeper;

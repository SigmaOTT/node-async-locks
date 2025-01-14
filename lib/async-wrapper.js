'use strict';

var AsyncLock = require('./async-lock');
var ResetEvent = require('./reset-event');
var _ = require('lodash');

var locks = {};


var result = {
    AsyncLock: AsyncLock,
    ResetEvent: ResetEvent,
    Promise: Promise,

    /**
     * Enters a critical section with the given name
     * @param {string} name - The name of the lock, every call to this function with the same name will enter the same lock
     * @param {function} callback - The callback that will be called once the lock is entered. The callback will receive one argument which is a 'done' function which must be called to free the lock
     * @param {number} timeout - The amount of time in milliseconds to wait before canceling the lock
     */
    lock: function (name, callback, timeout) {
        if (!name || typeof name !== 'string') {
            throw new Error('The name must be a non empty string');
        }

        if (!_.isFunction(callback)) {
            throw new Error('Callback must be a function');
        }

        if (!locks[name]) {
            locks[name] = new AsyncLock();
        }

        var lock = locks[name];
        lock.enter(function (token) {
            callback(function () {
                lock.leave(token);
            });
        }, timeout);
    },

    /**
     * Enters a critical section with the given name but expects the callback to return a $q promise.
     * When the promise is either resolved or rejected the lock will be unlocked.
     * @param {string} name - The name of the lock, every call to this function with the same name will enter the same lock
     * @param {function} callback - The callback that will be called once the lock is entered. The lock will be unlocked when the promise from this callback is either resolved or rejected
     */
    lockPromise: function (name, callback) {
        if (!name || typeof name !== 'string') {
            return this.Promise.reject('The name must be a non empty string');
        }

        if (!_.isFunction(callback)) {
            return this.Promise.reject('Callback must be a function');
        }

        if (!locks[name]) {
            locks[name] = new AsyncLock();
        }

        var args = Array.prototype.slice.call(arguments, 2);
        var lock = locks[name];

        return new this.Promise(function (resolve, reject) {
            lock.enter(function (token) {
                callback.apply(null, args).then(function (successData) {
                    resolve(successData);
                    lock.leave(token);
                }, function (failData) {
                    reject(failData);
                    lock.leave(token);
                });
            });
        });
    },

    releaseQueue: function (name) {
        if (!name || typeof name !== 'string') {
            throw new Error('The name must be a non empty string');
        }

        if (!locks[name]) {
            return;
        }

        var lock = locks[name];
        const queues = lock.queue.splice(0,lock.queue.length)
        for (var i = 0; i < queues.length; i++) { 
            queues[i].callback(queues[i]);
        }
    },

    /**
     * Returns true if a lock with the given name exists and false otherwise
     */
    lockExists: function (name) {
        if (!name || typeof name !== 'string') {
            throw new Error('The name must be a non empty string');
        }

        return Boolean(locks[name]);
    },

    /**
     * Returns true if the lock with the given name is locked and false otherwise
     * If the lock doesn't exist returns null
     */
    isLocked: function (name) {
        if (this.lockExists(name)) {
            return locks[name].isLocked();
        }
        return null;
    },

    /**
     * Returns the number of pending callbacks
     * If the lock doesn't exist returns null
     */
    queueSize: function (name) {
        if (this.lockExists(name)) {
            return locks[name].queueSize();
        }
        return null;
    },

    /**
     * Sets the options of a lock with the given name
     * If a lock with the given name doesn't exist, creates a lock
     */
    setOptions: function (name, options) {
        if (this.lockExists(name)) {
            locks[name].options = _.extend(locks[name].options, options);
        } else {
            locks[name] = new AsyncLock(options);
        }
    },

    /**
     * Returns a copy of the options of the lock with the given name
     * If the lock doesn't exist returns null
     */
    getOptions: function (name) {
        if (this.lockExists(name)) {
            return _.cloneDeep(locks[name].options);
        }

        return null;
    },

    /**
     * This function is for unit tests only, don't call it from your code
     * @private
     */
    __reset: function () {
        locks = {};
    }
};

module.exports = result;
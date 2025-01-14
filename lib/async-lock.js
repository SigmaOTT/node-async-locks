'use strict';

var _ = require('lodash');

var tokenId = 0;

function elapsed() {
    return new Date() - this.start;
}

function leave() {
    if (this.lock) {
        this.lock.leave(this);
    }
}

/**
 * An asynchronous lock.
 * @constructor
 * @param {object} options - optional set of options for this lock
 */
var AsyncLock = function (options) {
    this.queue = [];
    this.ownerTokenId = null;
    this.options = _.extend({}, AsyncLock.defaultOptions, options);
};

AsyncLock.defaultOptions = {
    maxQueueSize: Infinity,
    overflowStrategy: 'this'
};


/**
 * A function that is used to create a token. Override if needed.
 * @param {function} callback - The callback associated with the acquiring of this token.
 */
AsyncLock.prototype.createToken = function (callback) {
    return {
        id: tokenId++,
        isCanceled: false,
        callback: callback,
        elapsed: elapsed,
        start: new Date(),
        lock: this,
        leave: leave
    };
};

/**
 * Removes items from the given queue based on the given options
 * @param {array} queue - The queue of tokens
 * @param {object} options - The options that control the reduction algorithm
 * @returns an array of the tokens which were removed from the queue
 */
AsyncLock.prototype.reduceQueue = function (queue, options) {
    var result = [];
    if ((typeof options.maxQueueSize !== 'number') || isNaN(options.maxQueueSize)) {
        return result;
    }

    if (queue.length > options.maxQueueSize) {
        if (options.overflowStrategy === 'last') {
            var last = queue.pop();
            while (queue.length && queue.length > (options.maxQueueSize - 1)) {
                result.unshift(queue.pop());
            }
            queue.push(last);
            return result;
        }

        if (options.overflowStrategy === 'first') {
            while (queue.length && queue.length > options.maxQueueSize) {
                result.push(queue.shift());
            }
            return result;
        }

        if (queue.length && options.overflowStrategy === 'this') {
            result.push(queue.pop());
            return result;
        }
    }

    return result;
};

/**
 * A function that is used to execute the user callback. Default implementation invokes the callback asynchronously.
 * Override if needed.
 * @param {object} token - The the token which contains the callback to call.
 */
AsyncLock.prototype.executeCallback = function (token) {
    setTimeout(function () {
        token.callback(token);
    }, 0);
};

/**
 * Locks the lock and generates a token which can be used to control the lock.
 * @param {function} callback - The callback which is going to be called when the lock is acquired
 * @param {number} [timeout] - The amount of time to wait in milliseconds before canceling the callback call.
 * The callback is of the form foo(token) (i.e. it will receive the acquired token as a parameter when called)
 * @returns The token which controls the lock for this callback.
 */
AsyncLock.prototype.enter = function (callback, timeout) {

    if (!_.isFunction(callback)) {
        throw new Error('Callback must be a function');
    }

    var token = this.createToken(callback);

    if (token === null || token === undefined) {
        throw new Error('Token cannot be null or undefined');
    }

    if (this.ownerTokenId !== null) {
        this.queue.push(token);

        if (timeout) {
            token.timeoutId = setTimeout(function () {
                token.isCanceled = true;
                token.timeoutId = null;
            }, timeout);
        }

        var i, reducedTokens = this.reduceQueue(this.queue, this.options);
        for (i = 0; i < reducedTokens.length; i++) {
            reducedTokens[i].isCanceled = true;
            if (reducedTokens[i].timeoutId) {
                clearTimeout(reducedTokens[i].timeoutId);
            }
        }

    } else {
        this.ownerTokenId = token.id;
        this.executeCallback(token);
    }
    return token;
};

/**
 * Releases the lock and resumes the next waiting callback.
 * @param {object} token - The token which has acquired the lock.
 * @param {boolean} abortPending - If true, all pending callbacks are canceled and never executed
 * This token is used only to make sure that only the appropriate owner releases the lock.
 */

AsyncLock.prototype.leave = function (token, abortPending) {
    if (token === null || token === undefined) {
        throw new Error('Token cannot be null or undefined');
    }
    // if (this.ownerTokenId === null) {
    //     throw new Error('There is no pending token in the lock but received ' + JSON.stringify(token));
    // }

    // if (this.ownerTokenId !== token.id) {
    //     throw new Error('Owner token mismatch. Expected ' + this.ownerTokenId + ' but received ' + JSON.stringify(token.id));
    // }

    var queueToken;
    this.ownerTokenId = null;
    while (this.queue.length > 0) {
        queueToken = this.queue.shift();
        if (queueToken.timeoutId) {
            clearTimeout(queueToken.timeoutId);
        }

        if (queueToken.isCanceled) {
            continue;
        }
        if (abortPending === true) {
            queueToken.isCanceled = true;
        } else {
            this.ownerTokenId = queueToken.id;
            this.executeCallback(queueToken);
            break;
        }
    }
};


/**
 * Checks if this lock is currently locked
 */
AsyncLock.prototype.isLocked = function () {
    return this.ownerTokenId !== null;
};

/**
 * Returns the number of pending callbacks
 */
AsyncLock.prototype.queueSize = function () {
    return this.queue.length;
};

/**
 * Do not use this function, it is for unit tests only
 * @private
 */
AsyncLock.__reset = function(){
    tokenId = 0;
};


module.exports = AsyncLock;


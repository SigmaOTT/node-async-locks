describe('Async Wrapper', function () {

    var asyncWrapper = require('./../index');
    var expect = require('chai').expect;

    beforeEach(function () {
        asyncWrapper.__reset();
    });

    describe('Check if exists', function () {
        it('should return true for existing lock', function () {
            asyncWrapper.lock('hello', function () {
            });
            expect(asyncWrapper.lockExists('hello')).to.be.true;
        });

        it('should return false for non existing lock', function () {
            expect(asyncWrapper.lockExists('hello')).to.be.false;
        });


        it('should not allow non string lock name', function () {
            expect(function () {
                asyncWrapper.lockExists({});
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.lockExists('');
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.lockExists();
            }).to.throw('The name must be a non empty string');

        });


    });

    describe('Check is locked', function () {
        it('should check if a non existing lock is locked', function () {
            expect(asyncWrapper.isLocked('foo')).to.be.null;
        });

        it('should check if an existing unlocked lock is locked', function (done) {
            asyncWrapper.lock('foo', function (leave) {
                leave();
                expect(asyncWrapper.isLocked('foo')).to.be.false;
                done();
            });


        });

        it('should check if an existing locked lock is locked', function (done) {
            asyncWrapper.lock('foo', function () {
                expect(asyncWrapper.isLocked('foo')).to.be.true;
                done();
            });

        });

        it('should not allow non string lock name', function () {
            expect(function () {
                asyncWrapper.isLocked({});
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.isLocked('');
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.isLocked();
            }).to.throw('The name must be a non empty string');

        });
    });

    describe('Get queue size', function () {
        it('should get the size of non existing lock', function () {
            expect(asyncWrapper.queueSize('foo')).to.be.null;
        });

        it('should get the queue size of empty lock', function (done) {
            asyncWrapper.lock('foo', function (leave) {
                leave();
                expect(asyncWrapper.queueSize('foo')).to.be.equal(0);
                done();
            });
        });

        it('should get the queue size of non empty lock', function (done) {
            asyncWrapper.lock('foo', function (leave) {
                leave();
                expect(asyncWrapper.queueSize('foo')).to.be.equal(0);
            });

            asyncWrapper.lock('foo', function (leave) {
                done();
            });
            expect(asyncWrapper.queueSize('foo')).to.be.equal(1);
        });


        it('should not allow non string lock name', function () {
            expect(function () {
                asyncWrapper.isLocked({});
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.isLocked('');
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.isLocked();
            }).to.throw('The name must be a non empty string');

        });
    });

    describe('Get options', function () {
        it('should not get options of non existing lock', function () {
            expect(asyncWrapper.getOptions('hello')).to.be.null;
        });

        it('should get options of existing lock', function () {
            asyncWrapper.setOptions('lol', {a: 'a'});
            var options = asyncWrapper.getOptions('lol');
            expect(options).to.be.ok;
            expect(options.a).to.be.equal('a');
            expect(options.maxQueueSize).to.exist;
        });
    });

    describe('Set options', function () {
        it('should set options of non existing lock', function () {
            asyncWrapper.setOptions('lol', {a: 'a'});
            var options = asyncWrapper.getOptions('lol');
            expect(options).to.be.ok;
            expect(options.a).to.be.equal('a');
            expect(options.maxQueueSize).to.exist;
        });

        it('should set options of existing lock', function (done) {
            asyncWrapper.lock('lol', function (leave) {
                asyncWrapper.setOptions('lol', {a: 'a'});
                var options = asyncWrapper.getOptions('lol');
                expect(options).to.be.ok;
                expect(options.a).to.be.equal('a');
                expect(options.maxQueueSize).to.exist;
                done();
            });
            var originalOptions = asyncWrapper.getOptions('lol')
            expect(originalOptions).to.be.ok;
            expect(originalOptions.a).to.be.undefined;

        });
    });

    describe('Lock', function () {

        it('should execute the first entrant', function (done) {
            asyncWrapper.lock('A', function () {
                done();
            });

        });

        it('should allow only one execution within a lock', function (done) {

            asyncWrapper.lock('A', function () {
                asyncWrapper.lock('A', function () {
                    done('Should not be here');
                });
                done();
            });

        });

        it('should not allow non string lock name', function () {
            var foo = function () {
            };
            expect(function () {
                asyncWrapper.lock({}, foo);
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.lock('', foo);
            }).to.throw('The name must be a non empty string');

            expect(function () {
                asyncWrapper.lock(null, foo);
            }).to.throw('The name must be a non empty string');
        });

        it('should not allow entering with a non function', function () {
            expect(function () {
                asyncWrapper.lock('moo');
            }).to.throw('Callback must be a function');
        });

        it('should allow lock after unlocked by first entrant', function (done) {
            asyncWrapper.lock('A', function (leave) {
                leave();
            });

            asyncWrapper.lock('A', function () {
                done();
            });


        });

        it('should not call the callback if the timeout has expired and do call it if not expired', function (done) {
            asyncWrapper.lock('A', function (leave) {
                setTimeout(function () {
                    leave();

                }, 100);
            });


            asyncWrapper.lock('A', function () {
                done('error');
            }, 10);

            asyncWrapper.lock('A', function () {
                done();
            }, 1000);


        });
    });

    describe('Lock Promise', function () {

        var resolvedFunc = function () {
            return asyncWrapper.Promise.resolve('ok');
        };

        var rejectedFunc = function () {
            return asyncWrapper.Promise.reject('error');
        };


        it('should execute the first entrant and resolve', function (done) {
            asyncWrapper.lockPromise('A', resolvedFunc).then(function (result) {
                expect(result).to.be.equal('ok');
                done();
                return asyncWrapper.Promise.resolve();
            });

        });

        it('should execute the first entrant and reject', function (done) {
            asyncWrapper.lockPromise('A', rejectedFunc).then(function (result) {
                done('Should not reach here');
            }, function (result) {
                expect(result).to.be.equal('error');
                done();
                return asyncWrapper.Promise.resolve();
            });

        });


        it('should allow only one execution within a lock', function (done) {
            var count = 0;
            asyncWrapper.lockPromise('A', function () {
                var promise = asyncWrapper.Promise.resolve('ok');
                asyncWrapper.lockPromise('A', function () {
                    expect(count).to.be.equal(1);
                    done();
                    return asyncWrapper.Promise.resolve('ok');
                });
                expect(count).to.be.equal(0);
                return promise;

            }).then(function () {
                count++;
            });

        });

        it('should allow only one execution within a lock (regular inside promise)', function (done) {
            var count = 0;
            asyncWrapper.lockPromise('A', function () {
                var promise = asyncWrapper.Promise.resolve('ok');
                asyncWrapper.lock('A', function () {
                    expect(count).to.be.equal(1);
                    done();
                });
                expect(count).to.be.equal(0);
                return promise;

            }).then(function () {
                count++;
            });

        });

        it('should allow only one execution within a lock (promise inside regular)', function (done) {

            asyncWrapper.lock('A', function () {
                asyncWrapper.lockPromise('A', function () {
                    done('Should not be here');
                });
                done();
            });

        });

        it('should not allow non string lock name', function () {
            var foo = function () {
            };

            asyncWrapper.lockPromise({}, foo).then(function () {
                done('should not be here');
            }, function (err) {
                expect(err).to.be.equal('The name must be a non empty string');
            });


            asyncWrapper.lockPromise('', foo).then(function () {
                done('should not be here');
            }, function (err) {
                expect(err).to.be.equal('The name must be a non empty string');
            });

            asyncWrapper.lockPromise(null, foo).then(function () {
                done('should not be here');
            }, function (err) {
                expect(err).to.be.equal('The name must be a non empty string');
            });
        });

        it('should not allow entering with a non function', function () {
            asyncWrapper.lockPromise('moo').then(function () {
                done('should not be here');
            }, function (err) {
                expect(err).to.be.equal('Callback must be a function');
            });
        });

        it('should allow lock after unlocked by first entrant', function (done) {
            asyncWrapper.lockPromise('A', resolvedFunc).then(function () {
                asyncWrapper.lockPromise('A', resolvedFunc).then(function () {
                    done();
                    return asyncWrapper.Promise.resolve();
                });
            });

        });

        it('should pass arguments to the callback function', function (done) {
            asyncWrapper.lockPromise('A', function (a, b) {
                expect(a).to.be.equal(1);
                expect(b).to.be.equal('a');
                done();
                return asyncWrapper.Promise.resolve();
            }, 1, 'a');

        });

        it('releaseQueue should work find', async function () {
            const promises = []
            
            for (let i = 0; i < 100; i++) {
                promises.push(asyncWrapper.lockPromise('A', async function () {
                    await sleep(1000)
                    asyncWrapper.Promise.resolve('ok');
                    asyncWrapper.releaseQueue('A')
                }).then(function () {
                }))
            }
            await Promise.all(promises)
        });
    });
});

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
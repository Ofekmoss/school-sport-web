module.exports = {
    lock: async function (obj) {
        var release = null;
        var previousLock = obj.$lock;
        obj.$lock = new Promise(function (resolve) {
            release = resolve;
        });
        if (previousLock) {
            await previousLock;
        }
        return release;
    }
};
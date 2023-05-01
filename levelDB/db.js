var levelup = require('levelup')
var leveldown = require('leveldown')  
const encode = require('encoding-down')

//const db = new Level('algoDB', { valueEncoding: 'json' })

class LevelDb {
    constructor( options = {}) {
        this.options = options;
        this.db = new levelup(encode(leveldown('./mydb',{ valueEncoding: 'json' })))
    }
    put(key, value, callback) {
        if (key && value) {
            this.db.put(key, value, (error) => {
                callback(error);
            });
        } else {
            callback("no key or value");
        }
    }
    get(key, callback) {
        if (key) {
            this.db.get(key, (error, value) => {
                callback(error, value);
            });
        } else {
            callback("no key", key);
        }
    }
    delete(key, callback) {
        if (key) {
            this.db.del(key, (error) => {
                callback(error);
            });
        } else {
            callback("no key");
        }
    }

    batch(arr, callback) {
        if (Array.isArray(arr)) {
            var batchList = [];
            arr.forEach(item);
            {
                var listMember = {};
                if (item.hasOwnProperty("type")) {
                    listMember.type = item.type;
                }
                if (item.hasOwnProperty("key")) {
                    listMember.key = item.key;
                }
                if (item.hasOwnProperty("value")) {
                    listMember.value = item.value;
                }
                if (
                    listMember.hasOwnProperty("type") &&
                    listMember.hasOwnProperty("key") &&
                    listMember.hasOwnProperty("value")
                ) {
                    batchList.push(listMember);
                }
            }
            if (batchList && batchList.length > 0) {
                this.db.batch(batchList, (error) => {
                    callback(error, batchList);
                });
            } else {
                callback("array Membre format error");
            }
        } else {
            callback("not array");
        }
    }
    getNotifications(callback) {
        let self = this;
        let dataArray = [];
        //return new Promise(function(resolve, reject){
         this.db.createReadStream()
           .on('data', function (data) {
            if(data.key.indexOf("Notification_") != -1){
                var kik = JSON.parse(data.value);
                kik['key'] = data.key;
                dataArray.push(kik);
                //dataArray.push({"${kik}": JSON.parse(data.value)});
              }
            
            
            })
           .on('error', function (err) {
            callback(error);
            })
           .on('close', function () {
            callback(dataArray);
            })
       //})
   }



}
module.exports = LevelDb;


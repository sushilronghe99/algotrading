const express = require('express')

var KiteConnect = require("kiteconnect").KiteConnect;

var helper = require('./kitelib/helper');
const LevelDB = require("./levelDB/db")
const { parse } = require('querystring');
const bodyParser = require('body-parser')

const app = express()
// Tell express to use the body-parser middleware and to not parse extended bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

const port = 8080
const dbHelper = new LevelDB();

app.set('view engine', 'ejs')

const posts = [
    { title: 'Title 11', body: 'Body 1' },
    { title: 'Title 21', body: 'Body 2' },
    { title: 'Title 31', body: 'Body 3' },
    { title: 'Title 41', body: 'Body 4' },
]
const user = {
    firstName: 'Tim',
    lastName: 'Cook',
}

const TradingSymbol = "ITC";
const EXCHANGE = "NSE"
const QTY = 25;
const MARGIN = 20;

var kc;



app.get('/', async (req, res) => {
    if (req.query.request_token) {
        try {
            initKS(req.query.request_token, res).then(() => {
                console.log("after init ..", kc)

                kc.getLTP(["NSE:RELIANCE", "NSE:NIFTYBANK"]).then((response) => {
                    let data = response;
                    console.log(data)
                    res.render('pages/index', {

                        getRT: "func1();",
                        user: req.query,
                        kc: kc,
                        helper: helper,
                        data: data
                    })
                }).catch(function (err) {
                    console.log("There is rror")
                    console.log(err);
                })
            })


        } catch (error) {
            next(error)
        }
    }
    else {
        res.render('pages/index', {
            user: req.query,
            getRT: "func1();",
            kc: kc,
            helper: helper
        })
    }
})

app.get('/articles', (req, res) => {

    posts.forEach(element => {
        dbHelper.put(element.title, element.body, (error) => {
            if (error !== null) {
                //administratorsKeys.push(keyName);
                res.render('pages/articles', {
                    articles: posts
                })

            }
        });
    });
    

    
})


app.get('/triggers', (req, res) => {

    /*posts.forEach(element => {
        dbHelper.put(element.title, element.body, (error) => {
            if (error !== null) {
                //administratorsKeys.push(keyName);
            }
        });
    });*/

    dbHelper.getNotifications((values)=>{
        console.log(values)
        res.render('pages/articles', {
            articles: values
        })
    })
    

    
})


app.get('/aboutus', (req, res) => {

    var Notification = [];
    dbHelper.db.createReadStream({
      
       
    })
    .on('data', function (data) {
        console.log(data);
       if(data.key.indexOf("Notification_") != -1){
         Notification.push(data.value);
       }
     
    })
    .on('error', function (err) {
      console.log('Oh my!', err)
    })
    .on('close', function () {
      console.log('Stream closed');
      console.log(Notification)
    })
    .on('end', function () {
      console.log('Stream ended')
    })

  

    res.render('pages/aboutus', {
        articles: posts
    })
})


app.get('/getHoldings', (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));
    else {
        kc.getPositions()
            .then(function (response) {
                res.end(JSON.stringify(response, null, 3));
            }).catch(function (err) {
                res.end(JSON.stringify(err, null, 3));
            });


    }

})


app.get('/cancelGTT',(req,res)=>{
    //148000310
    res.setHeader('Content-Type', 'application/json');

    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));
    if (req.query.triggerId) {
        kc.deleteGTT(req.query.triggerId).then(function (resp) {
            console.log(resp)
        }).catch(function (error) {
            console.log(error)
        })
    }
    else{
        res.end(JSON.stringify({ "error": "bad request" }));
    }
})

function checkGTT(tradingsymbol){
    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");
        
        kc.getGTTs().then(function (resp) {
            resp.forEach(element=>{
                console.log(tradingsymbol)
                if(element.condition.tradingsymbol === tradingsymbol){
                  resolve("orderExist")
                }
            })
            resolve("noOrder")
           
        }).catch(function (err) {
            reject("error")
        })
    })
}
function checkPosition(tradingsymbol){
    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");
        
        kc.getPositions().then(function (resp) {
            resp.forEach(element=>{
                if(element.tradingsymbol === tradingsymbol){
                  resolve("tradeExist")
                }
            })
            resolve("noTradeFound")
           
        }).catch(function (err) {
            reject("error")
        })
    })
}

function getTradePosition(tradingsymbol){

    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");

    kc.getPositions()
    .then(function (response) {
        //res.end(JSON.stringify(response, null, 3));
        response.net.forEach(element => {
            console.log(element)
            if(element.tradingsymbol == req.query.tradingsymbol){
               resolve(element);
            }
        })
        resolve()
    }).catch(function (err) {
        reject("error")
    })

})
}

function placeGTT(tradingsymbol) {

    return new Promise((resolve, reject) => {
        getTradePosition(tradingsymbol).then(function (resp) {
            console.log(resp);
            if (resp) {
                var currentQty = resp.buy_quantity - resp.sell_quantity;
                var transaction_type = currentQty > 0 ? "SELL" : "BUY";


                //Lets now set the GTT for the trade.. also make sure there are not existing GTT for this trade. 
                checkGTT(req.query.tradingsymbol).then(function (response) {
                    console.log(response);
                    if (resp === "noOrder") {
                        createGTT(tradingsymbol, EXCHANGE, resp.last_price, QTY, transaction_type).then(function (res2) {
                            resolve()
                        })
                    }
                    else{
                        resolve("GTT Exist")
                    }

                })

            }
        })
    })
}

function placeOrder(tradingsymbol, transaction_type){

    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");

    kc.placeOrder("regular", {
        "exchange": EXCHANGE,
        "tradingsymbol": tradingsymbol,
        "transaction_type": transaction_type,
        "quantity": QTY,
        "product": "MIS", //MIS
        "order_type": "MARKET"
    }).then(function (resp) {
        resolve()
    }).catch(function (err) {
        reject(err)
    })
})
}

function createGTT(tradingSym, exchange, last_price, qty){

    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");

    kc.placeGTT({
        trigger_type: kc.GTT_TYPE_OCO,
        tradingsymbol: tradingSym,
        exchange: exchange, //NSE NFO
        trigger_values: [last_price-MARGIN, last_price+MARGIN],
        last_price: last_price,
        orders: [{
            transaction_type: kc.TRANSACTION_TYPE_SELL,
            quantity: qty,
            product: kc.PRODUCT_CNC,
            order_type: kc.ORDER_TYPE_LIMIT,
            price: last_price-MARGIN
        }, {
            transaction_type: kc.TRANSACTION_TYPE_SELL,
            quantity: qty,
            product: kc.PRODUCT_CNC,
            order_type: kc.ORDER_TYPE_LIMIT,
            price: last_price+MARGIN
        }]
    }).then(function (resp) {
        resolve(resp);
    }).catch(function (error) {
        reject(error)
    })
})
}
app.get('/getGTTs',(req,res)=>{
    //148000310
    res.setHeader('Content-Type', 'application/json');

    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));
    if (req.query.tradingsymbol) {
        checkGTT(req.query.tradingsymbol).then(function(resp){
            res.end(JSON.stringify(resp, null, 3));
        })
    }
    else{
        res.end(JSON.stringify({"error":"bad request"}, null, 3));
    }   
})


app.post('/receiveAlerts',(req,res)=>{
    //148000310
    //{{exchange}}:{{ticker}}:{{timenow}} , priceC = {{close}}, priceO = {{open}}, priceT = {{time}}, volume = {{volume}}
    //Where to find the title ? lets save this message and dispay it non a page. 
    //var body = req.body; 

    var date = helper.getDate();
    var key = "Notification_"+date;
    const body = req.body

    console.log(body)
    //res.end(JSON.stringify(body, null, 3));
        dbHelper.put(key, JSON.stringify(body), (error) => {
            if (error !== null) {
                //administratorsKeys.push(keyName);
                console.log(error)
                res.end(JSON.stringify({"message":"success"}, null, 3));
            }
        });

      

    


    //If buy 
    //Place Algo trad order for sale 
    //If sell
    //Place algo trade order fro sale 


})

app.get('/algoOrder', (req, res) => {

    
    if (!kc) return res.send(JSON.stringify({ "error": "kite not flying" }));
    
        if (req.query.tradingsymbol) {
            checkPosition(req.query.tradingsymbol).then(function(resp){
                if(resp == "noTradeFound"){ // No Position Found

                    placeOrder(req.query.tradingsymbol,"BUY").then(function(resp){ //Place order
                       
                        console.log(resp);
                        setTimeout(() => {
                            placeGTT(req.query.tradingsymbol).then(function(resp2){ //place GTT after 20 SEC
                                console.log(resp2);
                            })
                        }, 20000); //wait 10 second and then place GTT 
                    })
                 

                }
                else{
                    //First Clear the GTT 
                 //Then close this position. 
                 //Tell the program to recreate order after 10-20 sec. 
                }
            })
        }
    
})


//Find out how much quanity we are holding of the given stock. 
app.get('/placeGTT', (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));
    else {
        if (req.query.tradingsymbol) {
        kc.getPositions()
            .then(function (response) {
                //res.end(JSON.stringify(response, null, 3));
                response.net.forEach(element => {
                    console.log(element)
                    if(element.tradingsymbol == req.query.tradingsymbol){
                        var currentQty = element.buy_quantity - element.sell_quantity;
                        if(currentQty > 0){
                            //Lets now set the GTT for the trade.. also make sure there are not existing GTT for this trade. 
                        checkGTT(req.query.tradingsymbol).then(function(resp){
                            console.log(resp);
                            if(resp === "noOrder"){
                                kc.placeGTT({
                                    trigger_type: kc.GTT_TYPE_OCO,
                                    tradingsymbol: req.query.tradingsymbol,
                                    exchange: "NSE",
                                    trigger_values: [element.last_price-MARGIN, element.last_price+MARGIN],
                                    last_price: element.last_price,
                                    orders: [{
                                        transaction_type: kc.TRANSACTION_TYPE_SELL,
                                        quantity: currentQty,
                                        product: kc.PRODUCT_CNC,
                                        order_type: kc.ORDER_TYPE_LIMIT,
                                        price: element.last_price-MARGIN
                                    }, {
                                        transaction_type: kc.TRANSACTION_TYPE_SELL,
                                        quantity: currentQty,
                                        product: kc.PRODUCT_CNC,
                                        order_type: kc.ORDER_TYPE_LIMIT,
                                        price: element.last_price+MARGIN
                                    }]
                                }).then(function (resp) {
                                    console.log(resp);
                                    //Save This trigger Id - 
                                }).catch(function (error) {
                                    console.log(error)
                                })
                        }
                        else{
                            res.end(JSON.stringify({"error": resp}, null, 3));
                        }

                        })

                        }
                        res.end(JSON.stringify({"buyQty":element.buy_quantity,"setQty":element.sell_quantity,"last_price":element.last_price}, null, 3));
                    }
                });
            }).catch(function (err) {
                res.end(JSON.stringify(err, null, 3));
            });
        }
        else{
            res.end(JSON.stringify({ "error": "bad request" }));
        }
    }
})


app.get('/getOrders', (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));
    else {
        kc.getOrders()
            .then(function (response) {
                res.end(JSON.stringify(response, null, 3));
            }).catch(function (err) {
                res.end(JSON.stringify(err, null, 3));
            });
    }
})
app.get('/placeOrder', (req, res) => {
    console.log("In here ");
    res.setHeader('Content-Type', 'application/json');
    // http://localhost:8080/placeorder/?tradingsymbol=RELIANCE&transaction_type=BUY&quantity=1 
    // http://localhost:8080/placeorder/?tradingsymbol=BANKNIFTY27APR42900CE&transaction_type=BUY&quantity=25 

 // MIS - Intra day //
    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));
    else {
        if (req.query.tradingsymbol && req.query.transaction_type && req.query.quantity) {
            kc.placeOrder("regular", {
                "exchange": "NSE",//NSE
                "tradingsymbol": req.query.tradingsymbol,
                "transaction_type": req.query.transaction_type,
                "quantity": req.query.quantity,
                "product": "MIS", //MIS
                "order_type": "MARKET"
            }).then(function (resp) {
                console.log(resp);
                //{ order_id: '230427000386644' }
                res.end(JSON.stringify(resp, null, 3));
            }).catch(function (err) {
                console.log(err);
                res.end(JSON.stringify(err, null, 3));
            });
        }
        else {
            res.end(JSON.stringify({ "error": "bad request" }));
        }
    }

})

app.listen(port, () => {
    console.log(`App listening at port ${port}`)
})

function initKS(request_t, res) {
    var api_key = "353th5rd1v3iislo",
        secret = "bobcotxx5gr5uk0cdgf9w7kahw6udmn8",
        request_token = request_t,
        access_token = "";
    var options = {
        "api_key": api_key,
        "debug": false
    };
    return new Promise(function (resolve, reject) {
        kc = new KiteConnect(options);
        kc.setSessionExpiryHook(sessionHook);

        if (!access_token) {
            kc.generateSession(request_token, secret)
                .then(function (response) {
                    console.log("Response", response);
                    resolve();

                })
                .catch(function (err) {
                    console.log(err);
                    reject(err)
                })
        } else {
            kc.setAccessToken(access_token);
            resolve();

        }
    })
}
function sessionHook() {
    console.log("User loggedout");
}
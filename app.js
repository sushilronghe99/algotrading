const express = require('express')

var KiteConnect = require("kiteconnect").KiteConnect;

var helper = require('./kitelib/helper');
const LevelDB = require("./levelDB/db")
const { parse } = require('querystring');
const bodyParser = require('body-parser');
const { resolve } = require('path');

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
const MARGIN = 12;

var kc;



app.get('/', async (req, res) => {
    console.log("In get request ")
    if (req.query.request_token) {
        try {
            initKS(req.query.request_token, res).then(() => {
                console.log("after init ..", kc)

                kc.getOrders().then(function (response) {


                    res.render('pages/index', {

                        getRT: "func1();",
                        user: req.query,
                        kc: kc,
                        helper: helper,
                        data: response
                       
                    })
                }).catch(function (err) {
                      console.log(err)
                })

                
            })


        } catch (error) {
           console.log(error);
        }
    }
    else if(kc){
        kc.getOrders().then(function (response) {
         var user = {
            request_token : kc.access_token
         };
         

            res.render('pages/index', {

                getRT: "func1();",
                user: user,
                kc: kc,
                helper: helper,
                data: response
               
            })
        }).catch(function (err) {
              console.log(err)
        })
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

app.get('/errors', (req, res) => {
    dbHelper.getError((values)=>{
        console.log(values)
        res.render('pages/errors', {
            errors: values
        })
    })
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
//https://udev.co.in/getQuote/?instrument=NSE:RELIANCE
app.get('/getQuote',(req,res)=>{
    res.setHeader('content-Type','application/json');
    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));
    kc.getQuote(req.query.instrument).then((response) => {
        let data = response;
        res.end(JSON.stringify(data)); 
        
    }).catch(function (err) {
        console.log("There is rror")
        res.end(JSON.stringify({ "error": "bad request" })); 
    })
})

//230502001537082
app.get('/getOrderDetail',(req,res)=>{
    res.setHeader('content-Type','application/json');
    if (!kc) res.end(JSON.stringify({ "error": "kite not flying" }));

    
        kc.getOrders()
            .then(function (response) {
                //res.end(JSON.stringify(response, null, 3));
                response.forEach((ord)=>{
                    if(ord.order_id == req.query.orderID){
                        console.log(ord.status);
                    }
                })
            }).catch(function (err) {
                res.end(JSON.stringify(err, null, 3));
            });
    

    kc.getOrders(req.query.instrument).then((response) => {
        let data = response;
        res.end(JSON.stringify(data)); 
        
    }).catch(function (err) {
        console.log("There is rror")
        res.end(JSON.stringify({ "error": "bad request" })); 
    })
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

                console.log(element)
                if(element.condition.tradingsymbol === tradingsymbol && element.status != "triggered"){
                  resolve("orderExist")
                }
            })
            resolve("noOrder")
           
        }).catch(function (err) {
            reject("error")
        })
    })
}

function checkOrderDetail(orderID){
    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");
        
        kc.getOrders().then(function (response) {
               console.log(response);
               console.log(orderID);
                response.forEach((ord)=>{
                    if(ord.order_id == orderID){
                        resolve(ord.status);
                    }
                })
               // resolve();
            }).catch(function (err) {
                console.log(err);
                reject(err);
            });
    })
}


function checkPosition(tradingsymbol){
    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");
        
        kc.getPositions().then(function (resp) {
            console.log(resp);
            resp.net.forEach(element=>{
                
                if(element.tradingsymbol === tradingsymbol && element.quantity > 0){
                  resolve("tradeExist")
                  //This is wrong 
                }
            })
            resolve("noTradeFound")
           
        }).catch(function (err) {
            console.log(err);
            reject("error")
        })
    })
}

function getTradePosition(tradingsymbol){

    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");

    kc.getPositions().then(function (response) {
        //res.end(JSON.stringify(response, null, 3));
        response.net.forEach(element => {
            console.log(element)
            if(element.tradingsymbol == tradingsymbol){
               resolve(element);
            }
        })
        resolve()
    }).catch(function (err) {
        reject("error")
    })

})
}

function placeGTT(tradingsymbol,product,sl,limit) {

    return new Promise((resolve, reject) => {
        getTradePosition(tradingsymbol).then(function (resp) {
            console.log("Getting trade position ..")
            console.log(resp);
            if (resp) {
                //var currentQty = resp.buy_quantity - resp.sell_quantity;
                //var transaction_type = currentQty > 0 ? "SELL" : "BUY";


                //Lets now set the GTT for the trade.. also make sure there are not existing GTT for this trade. 
                checkGTT(tradingsymbol).then(function (response) {
                    console.log(response);
                    if (response === "noOrder") {
                        createGTT(resp.tradingsymbol, resp.exchange,product, resp.last_price, resp.quantity, sl,limit).then(function (res2) {
                            resolve(res2)
                        }).catch(function (err) {
                            reject(err)
                        })
                    }
                    else{
                        resolve("GTT Exist")
                    }

                }).catch(function (err) {
                    reject(err)
                })

            }
            else{
                resolve("Trade position not found")
            }
        }).catch(function (err) {
            reject(err)
        })
    })
}

function placeOrder(tradingsymbol, exchange,product,quantity){

    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");

    kc.placeOrder("regular", {
        "exchange": exchange,
        "tradingsymbol": tradingsymbol,
        "transaction_type": "BUY",
        "quantity": quantity,
        "product": product, //MIS
        "order_type": "MARKET"
    }).then(function (resp) {
        resolve(resp)
    }).catch(function (err) {
        reject(err)
    })
})
}

function placeAlgoOrder(tradingsymbol,exchange,product,quantity,sl,limit){
    return new Promise((resolve,reject)=>{
        if(!kc) reject("kite not flying");

        checkPosition(tradingsymbol).then(function(resp){
            if(resp == "noTradeFound"){ // No Position Found so place order 
              console.log("No trade found. ")
                placeOrder(tradingsymbol,exchange,product,quantity).then(function(resp){ //Place order
                   console.log(resp);

                    setTimeout(() => {
                        console.log("Checking Order Detail .. ")
                        checkOrderDetail(resp.order_id).then(function(res){
                            console.log(res);
                            if(res == "COMPLETE"){
                            console.log("placing GTT")
                                 placeGTT(tradingsymbol,product,sl,limit).then(function(resp2){ //place GTT after 20 SEC
                                     console.log(resp2);
                                     resolve("Order & GTT Placed")
                                 }).catch(function(err){
                                    reject(err);
                                 })
                            
                            }
                            else{
                                reject(res)
                            }
                         }).catch(function(err){
                            console.log(err);
                            reject(err);
                        })
                    }, 5000); //Give it 5 sec to excute the order
                    
                    
                }).catch(function(err){
                    console.log(err);
                    var date = helper.getDate();
                    var key = "Error_"+date;
                    try{
                    const body = err;
                   
                    body["tradingsymbol"] = tradingsymbol;
                
    
                        dbHelper.put(key, JSON.stringify(body), (error) => {
                            if (error !== null) {
                            }
                        })
                    }
                    catch(errr){
                        console.log(errr)
                    }

                    reject(err);
                })
             

            }
            else{
                //First Clear the GTT 
             //Then close this position. 
             //Tell the program to recreate order after 10-20 sec. 
             reject("Trade Exist");
            }
        }).catch(function(error){
            console.log("check Position " , error)
        })
    })
}

function createGTT(tradingSym, exchange, product, last_price, qty,sl,limit){

    return new Promise((resolve, reject) => {
        if (!kc) reject("kite failed");

        console.log("tradingSym" + tradingSym);
        console.log("exchange" + exchange);
        console.log("product" + product);
        console.log("last_price" + last_price);
        console.log("QTY" + qty);
        console.log("Limit & SL ", limit +" "+sl);

    kc.placeGTT({
        trigger_type: kc.GTT_TYPE_OCO,
        tradingsymbol: tradingSym,
        exchange: exchange, //NSE NFO
        trigger_values: [last_price-sl, last_price+limit],
        last_price: last_price,
        orders: [{
            transaction_type: kc.TRANSACTION_TYPE_SELL,
            quantity: qty,
            product: product,//kc.PRODUCT_MIS,
            order_type: kc.ORDER_TYPE_LIMIT,
            price: last_price-sl
        }, {
            transaction_type: kc.TRANSACTION_TYPE_SELL,
            quantity: qty,
            product: product,//kc.PRODUCT_MIS,
            order_type: kc.ORDER_TYPE_LIMIT,
            price: last_price+limit
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
    //NFO:BANKNIFTY23MAY43600CE
    //NFO:BANKNIFTY23MAY43300PE
    //{{exchange}}:{{ticker}}:{{timenow}} , priceC = {{close}}, priceO = {{open}}, priceT = {{time}}, volume = {{volume}}
    //Where to find the title ? lets save this message and dispay it non a page. 
    //var body = req.body; 

    var date = helper.getDate();
    var key = "Notification_"+date;
    const body = req.body

    var trade, exchange, product, quantity, sl, limit;

    console.log(body)
    //res.end(JSON.stringify(body, null, 3));
        dbHelper.put(key, JSON.stringify(body), (error) => {
            if (error !== null) {
                //administratorsKeys.push(keyName);
                if(Array.isArray(body)){
                   //get most recent one - that is last one 
                  
                   let lastElement = body[body.length - 1];
                    res.end(JSON.stringify({"message":"success"}, null, 3));
                    trade = lastElement.tradingsymbol;
                    exchange = lastElement.exchange;
                    product = lastElement.product;
                    quantity = lastElement.quantity;
                    sl = lastElement.sl;
                    limit = lastElement.limit;


                    console.log("TradingSymbol", trade)
                    console.log("exchange", exchange)
                    console.log("product", product)
                    console.log("QTY", quantity)
                    console.log("SL", sl)
                    console.log("Limit", limit)
                }
                else{
                    console.log(error)
                    res.end(JSON.stringify({"message":"success"}, null, 3));
                    trade = body.tradingsymbol;
                    exchange = body.exchange;
                    product = body.product;
                    quantity = body.quantity;
                    sl = body.sl;
                    limit = body.limit;

                    console.log("TradingSymbol", trade)
                    console.log("exchange", exchange)
                    console.log("product", product)
                    console.log("QTY", quantity)
                    console.log("SL", sl)
                    console.log("Limit", limit)
                }
                
            if(quantity > 0 && trade){
                console.log("placing order Now ..")
                placeAlgoOrder(trade,exchange,product, quantity,sl,limit).then(function(res){
                    res.end(JSON.stringify({"success": res}, null, 3));
                }).catch(function(err){
                    res.end(JSON.stringify({"error": err}, null, 3));
                })
            }

            }
        });

      

    


    //If buy 
    //Place Algo trad order for sale 
    //If sell
    //Place algo trade order fro sale 


})

//http://localhost:8080/algoOrder/?tradingsymbol=BANKNIFTY23MAY43500CE&transaction_type=BUY&quantity=25&product=MIS&exchange=NFO

//http://localhost:8080/algoOrder/?tradingsymbol=BANKNIFTY23MAY43400PE&transaction_type=BUY&quantity=25&product=MIS&exchange=NFO
app.get('/algoOrder', (req, res) => {

    
    if (!kc) return res.send(JSON.stringify({ "error": "kite not flying" }));
     
    console.log(req.query)
        if (req.query.tradingsymbol) {
            try{
            placeAlgoOrder(req.query.tradingsymbol,req.query.exchange,req.query.product, req.query.quantity).then(function(res){
                res.end(JSON.stringify({"success": res}, null, 3));
            }).catch(function(err){
                res.end(JSON.stringify({"error": err}, null, 3));
            })
        }
        catch(err){
            console.log(err);
        }
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
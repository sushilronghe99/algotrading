

function getQuote(kc,instruments) {
	kc.getQuote(instruments).then(function(response) {
		console.log(response);
	}).catch(function(err) {
		console.log(err);
	})
}

function getOHLC(kc, instruments) {
	kc.getOHLC(instruments).then(function(response) {
		console.log(response);
	}).catch(function(err) {
		console.log(err);
	})
}

const getLTP = async(kc, instruments) => {
	kc.getLTP(instruments).then(function(response) {
        console.log(response);
		return response;
	}).catch(function(err) {
        console.log("There is rror")
		console.log(err);
	})
}

function getDate(){
	var date=new Date();  
	var day=date.getDate();  
	var month=date.getMonth()+1;  
	var year=date.getFullYear();  

	var h=date.getHours();  
    var m=date.getMinutes();  
	var s=date.getSeconds(); 

	return day+"/"+month+"/"+year+"_"+h+":"+m+":"+s;
}

module.exports = {
    getQuote: getQuote,
    getOHLC: getOHLC,
    getLTP: getLTP,
	getDate: getDate
}

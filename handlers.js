var helpers = require('./helpers');
// var https = require('https');
var axios = require('axios');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}
// var path = require('path');
// var fs = require('fs');
var handlers = {}

//if prod - no cache, else yes cache
handlers.cache = process.env.PORT ? false : true; 

/**HOME */
handlers.index = function(data,callback){
    // Reject any request that isn't a GET
    if(data.method == 'get'){   
    
      var finalErr = '';
      var finalStr = '';

      helpers.getTemplate('header',function(headerErr,headerStr){
        finalErr = headerErr;
        finalStr += headerStr;    
      
        helpers.getTemplate('partials',function(partialErrs,partialStr){
          finalErr = partialErrs;
          finalStr += partialStr;

          helpers.getTemplate('pages',function(pagesErrs,pagesStr){
            finalErr = pagesErrs;
            finalStr += pagesStr;
            
            helpers.getTemplate('footer',function(footerErr,footerStr){
              finalErr = footerErr;
              finalStr += footerStr;
            
              if(!finalErr && finalStr){
                callback(200,finalStr,'html');
              } else {
                callback(500,undefined,'html')
              }
            });

          });

        });
      
      }); 

    } else {
      callback(405,undefined,'html');
    }
  };

// Public assets
handlers.public = function(data,callback){
  // Reject any request that isn't a GET
  if(data.method == 'get'){
    
    // Get the filename being requested
    var trimmedAssetName = data.trimmedPath.replace('public/','').trim();

    if(trimmedAssetName.length > 0){
      // Read in the asset's data
      helpers.getStaticAsset(trimmedAssetName,function(err,data){

        if(!err && data){

          // Determine the content type (default to plain text)
          var contentType = 'plain';

          if(trimmedAssetName.indexOf('.css') > -1){
            contentType = 'css';
          }

          if(trimmedAssetName.indexOf('.png') > -1){
            contentType = 'png';
          }

          if(trimmedAssetName.indexOf('.jpg') > -1){
            contentType = 'jpg';
          }

          if(trimmedAssetName.indexOf('.ico') > -1){
            contentType = 'favicon';
          }

          // Callback the data
          callback(200,data,contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }

  } else {
    callback(405);
  }
};

// Favicon
handlers.favicon = function(data,callback){ 
  // Reject any request that isn't a GET
  if(data.method == 'get'){
    // Read in the favicon's data
    helpers.getStaticAsset('favicon.ico',function(err,data){
      if(!err && data){
        // Callback the data
        callback(200,data,'favicon');
      } else {
        callback(500);
      }
    });
  } else {
    callback(405);
  }
};



/********BACKEND*************/  
handlers.apiApod = function(data,cb){    
  //endpoint: /api/apod
  var path = '/planetary/apod' + '?api_key=' + process.env.API_KEY;   
  axios.get('https://api.nasa.gov'+path).then(response => {
    cb(200,response.data,'json');
  }).catch(error => {
    console.log(error);
    cb(400);
  }); 
};
handlers.apiSearch = function(data,cb){
  
  var apiUrl = 'https://images-api.nasa.gov/search?'; 
  var reqUrl = data.reqUrl;
  var qs = ''; 


  // console.log(data.queryStringObject);

  // return false;


  qs = helpers.ObjtoQueryString(data.queryStringObject); 
  qs = qs.replace('term=','q=');
  
  if(handlers.cache){ //if is on
    //check cacheTable 
    helpers.checkCacheTable(reqUrl,function(cacheExist, data){      
      if(!cacheExist){       
        axios.get(apiUrl+qs).then(response => {
            helpers.buildCache(reqUrl,response.data.collection,function(err){
              console.log(err);
            });            
            cb(200,response.data.collection,'json');
        }).catch(error => {
            console.log(error);
            cb(400);
        });     
      
      }else{        
        helpers.readFromCache(data.file, function(respObj){
          cb(200,respObj,'json');
        });         
      }
    })   
 
  }else{
    axios.get(apiUrl+qs).then(response => {       
      cb(200,response.data.collection,'json');
    }).catch(error => {
      console.log(error);
      cb(400);
    });  
  }
};

handlers.apiCacheBuster = function(data,cb){
  helpers.rmDir('./cache/',false);
  helpers.emptyCacheTable();
  cb(200,'cache busted','html');
}


handlers.apiDetails = function(data,cb){
   //endpoint: /api/details?id=JSC-20160921-PH_JNB01_0003
   var id = data.queryStringObject.id; 
   var reqUrl = data.reqUrl;

   if(!id){
     cb(400);
   }

   if(handlers.cache){ //if is on
    //check cacheTable 
    helpers.checkCacheTable(reqUrl,function(cacheExist, data){      
      if(!cacheExist){      
        axios.get('https://images-api.nasa.gov/search?nasa_id='+id).then(response1 => {   
          axios.get('https://images-api.nasa.gov/asset/'+id).then(response2 => {       
                response1.data.collection.assets = {};     
                response1.data.collection.assets = response2.data.collection;
                helpers.buildCache(reqUrl,response1.data.collection,function(err){
                    console.log(err);
                });    
                cb(200,response1.data.collection,'json');
            }).catch(error => {
              console.log(error);
              cb(400);
            });  
        }).catch(error => {
          console.log(error);
          cb(400);
        });   
      
      }else{        
        helpers.readFromCache(data.file, function(respObj){
          cb(200,respObj,'json');
        });         
      }
    })   
 
  }else{
    axios.get('https://images-api.nasa.gov/search?nasa_id='+id).then(response1 => {   
      axios.get('https://images-api.nasa.gov/asset/'+id).then(response2 => {       
            response1.data.collection.assets = {};     
            response1.data.collection.assets = response2.data.collection;           
            cb(200,response1.data.collection,'json');
        }).catch(error => {
          console.log(error);
          cb(400);
        });  
    }).catch(error => {
      console.log(error);
      cb(400);
    }); 
  }
}


handlers.apiMars = function(data,cb){    
  //endpoint: /api/mars?sol=1000&camera=fhaz
  var path = 'https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?'; // +   
  var params = helpers.ObjtoQueryString(data.queryStringObject); 
  var key = '&api_key=' + process.env.API_KEY;
  axios.get(path+params+key).then(response => {    
    cb(200,response.data.photos,'json');
  }).catch(error => {
    console.log(error);
    cb(400);
  }); 
};
handlers.notFound = function(data,cb){
    cb(400);
};


module.exports = handlers;
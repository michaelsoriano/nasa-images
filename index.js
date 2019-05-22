var helpers = require('./helpers');
var handlers = require('./handlers');
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');
var util = require('util');
var debug = util.debuglog('server');


var httpserver = http.createServer(function(req,res){
    var parsedUrl = url.parse(req.url,true);
  
    //get path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');
    //get querystrings...
    var queryStringObject = parsedUrl.query;
    
    //get the method e.g. GET,POST etc..
    var method = req.method.toLowerCase();

    //get the headers e.g. user-agent, application/type, etc.
    var headers  = req.headers;

    //get payload
    var decoder = new StringDecoder('utf-8');
    var buffer = ''; 
    req.on('data',function(data){
        buffer += decoder.write(data);
    })
    req.on('end',function(){
        buffer += decoder.end();
        
        //choose the handler depending on url
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
 
        // If the request is within the public directory use to the public handler instead
        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

        //construct data obj to send to handler....
        var data = { 
          'reqUrl' : req.url,
          'trimmedPath' : trimmedPath,
          'queryStringObject' : queryStringObject,
          'method' : method,
          'headers' : headers,
          'payload' : helpers.parseJsonToObject(buffer)
        };

          // Route the request to the handler specified in the router
       chosenHandler(data,function(statusCode,payload,contentType){

          // Determine the type of response (fallback to JSON)
          contentType = typeof(contentType) == 'string' ? contentType : 'json';

          // Use the status code returned from the handler, or set the default status code to 200
          statusCode = typeof(statusCode) == 'number' ? statusCode : 200; 

          // Return the response parts that are content-type specific
          var payloadString = '';
          if(contentType == 'json'){
            res.setHeader('Content-Type', 'application/json');
            payload = typeof(payload) == 'object'? payload : {};
            payloadString = JSON.stringify(payload);
          }

          if(contentType == 'html'){
            res.setHeader('Content-Type', 'text/html');
            payloadString = typeof(payload) == 'string'? payload : '';
          }

          if(contentType == 'favicon'){
            res.setHeader('Content-Type', 'image/x-icon');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
          }

          if(contentType == 'plain'){
            res.setHeader('Content-Type', 'text/plain');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
          }

          if(contentType == 'css'){
            res.setHeader('Content-Type', 'text/css');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
          }

          if(contentType == 'png'){
            res.setHeader('Content-Type', 'image/png');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
          }

          if(contentType == 'jpg'){
            res.setHeader('Content-Type', 'image/jpeg');
            payloadString = typeof(payload) !== 'undefined' ? payload : '';
          }

          // Return the response-parts common to all content-types
          res.writeHead(statusCode);
          res.end(payloadString);

          // If the response is 200, print green, otherwise print red
          if(statusCode == 200){
            debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
          } else {
            debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
          }
      });
 
    })
  });

var port = process.env.PORT || 5000; 
httpserver.listen(port,function(){
    console.log('Server is running on port -> ' + port); 
});



 

//routers
var router = {
    '' : handlers.index,
    'favicon.ico' : handlers.favicon,
    'public' : handlers.public,
    'api/apod' : handlers.apiApod, 
    'api/search' : handlers.apiSearch, 
    'api/details' : handlers.apiDetails, 
    'api/mars' : handlers.apiMars, 
    'api/cachebuster' : handlers.apiCacheBuster   
}
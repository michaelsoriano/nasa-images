/*
 * Helpers for various tasks
 *
 */

// Dependencies
var path = require('path');
var fs = require('fs');

// Container for all the helpers
var helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
  try{
    var obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

// Get the string content of a template
helpers.getTemplate = function(templateName,callback){
  templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
  if(templateName){
    var templatesDir = path.join(__dirname,'./templates/');
    fs.readFile(templatesDir+templateName+'.html', 'utf8', function(err,str){ 
      if(!err && str && str.length > 0){
        callback(false,str);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
}

helpers.getAllTemplates = function(onFileContent, onError){     
   
    var templatesDir = path.join(__dirname,'./templates/'); 
 
      fs.readdir(templatesDir, function(err, filenames) {
        if (err) {
          onError(err);
          return;
        }
        filenames.forEach(function(filename) {
          fs.readFile(templatesDir + filename, 'utf-8', function(err, content) {
            if (err) {
              onError(err);
              return;
            }
            onFileContent(filename, content);
          });
        });
      }); 
}

// Get the contents of a static (public) asset
helpers.getStaticAsset = function(fileName,callback){ 
  fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
  if(fileName){
    var publicDir = path.join(__dirname,'./public/');
    fs.readFile(publicDir+fileName, function(err,data){
      if(!err && data){
        callback(false,data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('A valid file name was not specified');
  }
};

helpers.ObjtoQueryString = function(obj,callback){  
  obj = typeof(obj) == 'object' ? obj : false;
  if(obj){
    var queryString = Object.keys(obj).map(function(key) {
      return key + '=' + obj[key]
    }).join('&');
    return queryString;
  }else{
    callback('Ojbect is invalid');
  }  
}

helpers.randomString = function(){
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 16; i++){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

helpers.readFromCache = function(fileName, callback){
  var dir = path.join(__dirname,'/cache/');  
  fs.readFile(dir + fileName, 'utf8', function(err,data){     
    if(!err && data){
      var data = helpers.parseJsonToObject(data); 
      callback(data);
    }else{
      console.log('error in reading cache file');
      console.log(err);
      callback(400);
    }
  });
}

helpers.buildCache = function(reqUrl,data, callback){
  console.log('inside build cache');
  var dir = path.join(__dirname,'/cache/');
  var cachedFile = helpers.randomString() + ".json"; 

  fs.writeFile(dir+cachedFile,JSON.stringify(data),function(err){
    if(!err){
      var cacheTableJSON = path.join(__dirname,'/cacheTable.json');    
      fs.readFile(cacheTableJSON, 'utf8', function(err2,data){     
        if(!err2 && data){       
            var newObj = {
              "reqUrl" : reqUrl, 
              "file" : cachedFile
            } 
            var parsedData = helpers.parseJsonToObject(data);   
            parsedData.push(newObj);        
            
            fs.writeFile(cacheTableJSON,JSON.stringify(parsedData, null, "\t"),function(err3){
              if(!err3){
                console.log('cache table updated');
              }else{
                callback(err3);
              }
            });
        } else {
          callback(err2);
        }
      }); //end readfile
    }else{
      callback(err);
    }
  }); 
  
}

helpers.checkCacheTable = function(reqUrl,callback){
  
  var cacheTableJSON = path.join(__dirname,'/cacheTable.json');
  fs.readFile(cacheTableJSON, 'utf8', function(err,data){     
    if(!err && data){      

      var parsedData = helpers.parseJsonToObject(data);   
      var found = {};
      
      for(var i=0; i<parsedData.length; i++){         
        Object.keys(parsedData[i]).forEach(function(key) {  
            if(key === 'reqUrl' && parsedData[i]['reqUrl'] == reqUrl){            
              found = parsedData[i];
            } 
        });  
      }
      if(Object.keys(found).length !== 0){
          callback(true,found);
      }else{
          callback(false,{});         
      }     
    } else {
      callback(err,data);
    }
  }); //end readfile
};

helpers.rmDir = function(dirPath, removeSelf) {
  dirPath = path.join(__dirname,dirPath);  
  if (removeSelf === undefined)
    removeSelf = true;
  try { var files = fs.readdirSync(dirPath); }
  catch(e) { return; }
  if (files.length > 0)
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile())
        fs.unlinkSync(filePath);
      else
        rmDir(filePath);
    }
  if (removeSelf)
    fs.rmdirSync(dirPath);
};

helpers.emptyCacheTable = function(){
  var cacheTableJSON = path.join(__dirname,'/cacheTable.json');    
  fs.writeFile(cacheTableJSON,'[]',function(err){
    if(!err){
      console.log('cache table emptied');
    } 
  });
  
}

// Export the module
module.exports = helpers;

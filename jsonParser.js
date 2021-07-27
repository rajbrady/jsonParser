 //Import the RefParser
const $RefParser = require("@apidevtools/json-schema-ref-parser");
//import prune
const prune = require('json-prune');
//import parsers and validators
const SwaggerParser = require("@apidevtools/swagger-parser");
var swagger_validator = require("swagger-object-validator");
const Converter = require('@itentialopensource/api-spec-converter');
//Initialize the Parser Class to use
let parser = new $RefParser();
//Import the FS class
const fs = require('fs')
//Reads in the local JSON File
let raw = fs.readFileSync('SymantecMgmtCenter-OpenApi3Json.json');
//Parses the data into a proper JSON form
let data = JSON.parse(raw);
//function to iterate through the main contents of the json
function iterateThrough(obj) {
  if (!obj || typeof(obj)!=="object") return ;
  //prints all keys of top object
  for (var keys in obj) {
    console.log(keys);
  }
}


function deleteExample(obj) {
  if (!obj || typeof(obj) !== 'object') return ;
  const t = Object.keys(obj);
  for (let i = 0; i < t.length; i += 1) {
    if (!obj[t[i]]) {
      //continue ;
    }
    if (t[i] === "example") {
      console.log(2);
      delete obj[t[i]];
    }
  }
}

function deleteSummary(obj) {
  if (!obj || typeof(obj) !== 'object') return ;
  const t = Object.keys(obj);
  for (let i = 0; i < t.length; i += 1) {
    if (!obj[t[i]]) {
      continue ;
    }
    if (typeof(obj[t[i]]) === 'object') {
      deleteSummary(obj[t[i]]);
    } else if(typeof(obj[t[i]]) === 'string') {
      if (t[i] === 'summary') {
        delete obj[t[i]];
      }
    }
  }
}

function cleanJSON(obj) {
  if (!obj || typeof(obj) !== 'object') return ;
  //console.log(1);
  const t = Object.keys(obj);
  for (let i = 0; i < t.length; i += 1) {
    if (!obj[t[i]]) {
      continue ;
    }
    if (typeof(obj[t[i]]) === 'object') {
      const temp = Object.keys(obj[t[i]]);
      if (temp.length < 1) {
        //console.log("asdfd");
        delete obj[t[i]];
      } else {
        cleanJSON(obj[t[i]]);
      }
    } else if (typeof(obj[t[i]]) == 'string') {
      if (obj[t[i]] === "") {
        //console.log("asdfasdfadfasddsf");
        delete obj[t[i]];
      }
    }
  }
}
//if prunes are implemented then only do we run the delete prune
var checkPrune = false;
/**
*@param obj - JSON file to be iterated over
*This takes in a pruned JSON and deletes the -prune- value
*/
function deletePrune(obj) {
  // if it's not an object no child objects so don't recurse
  if (!obj || typeof (obj) !== 'object') return;
  // iterates through object's keys
  const t = Object.keys(obj);
  for (let i = 0; i < t.length; i += 1) {
    // keep recursing if it's an object
    if (typeof (obj[t[i]]) === 'object') {
      deletePrune(obj[t[i]]);
    } else if (obj[t[i]] === '-pruned-') {
      // check if it's pruned and delete it if that's the case
      delete obj[t[i]];
    }
  }
}


/**
*@param obj - object that is having its references wrapped
*Wraps the references within it's own {} so the dereferencing doesn't get mixed up
*/
function wrapReferences(obj) {
  //if it's not an object return;
  if (!obj || typeof(obj)!=="object") return ;
  //iterates through the keys
  for (var keys in obj) {
    //check if it's a reference and if there are more than one thing in the object
    if (keys == "$ref" && Object.keys(obj).length > 1) {
      //initializes body of object
      obj.body = {};
      obj.body['$ref'] = obj[keys];
      //deletes original object
      delete obj[keys];
    }
    //recurse to lower objects
    wrapReferences(obj[keys]);
  }
}

/**
*@param obj - JSON that the formats will be removed from
*@param str - the string that should be removed
*Method to remove formats(all occurrences) from JSONs
**/
function removeFormat(obj, str){
    //returns 0 if this is the bottom of the level in the JSON
    if(!obj || typeof(obj)!=="object") return 0;
    //Gathers all of the keys of the current obj
    const keys = Object.keys(obj);
    //Iterate through all the keys
    keys.forEach(key=>{
        //checks if the current key is at the bottom level in a JSON or not
        var a = removeFormat(obj[key], str);
        //removes the format if it exists and is a leaf
        if (key == str && a == 0) {
            //deletes the element
            delete obj[str];
        }
    })
    //returns 1 to indicate it is not at the bottom level of a JSON
    return 1;
}
//starts lowestDepth at -1 so that we know string hasn't been found
var lowDepth = -1;
/**
*@param obj - The JSON object being parsed through
*@param depth - the current depth of said object within the grand scope of the JSON
*@param str - The current string being parsed through to find throughout the object
*Gets the highest level of the occurence of the string(e.g. definitions)
**/
function getHighLevel(obj, depth, str) {
  //if not an object return
  if (!obj || typeof(obj) !== "object") return ;
  //console.log(depth);
  //iterates through the children of the object
  for (var keys in obj) {
    //check if they key is equal to the string
    if (keys == str) {
      //checks if there has been a string already found
      if (lowDepth == -1) {
        lowDepth = depth;
      }
      //if there has already been an occurrence of the string
      //if so, pick the depth that is higher up
      else if (lowDepth > depth) {
        depth = lowDepth;
      }
    }
    //recurse over the object
    getHighLevel(obj[keys], depth+1);
  }
}

function getLowestValue(obj, depth, str) {
  //don't parse through if it's not an object or is NULL
  if (!obj || typeof(obj) !== "object") return ;
  //if the lowDepth is -1, that means there is no occurrences of str
  if (lowDepth == -1) {
    return ;
  }
  //iterate through they keys of the object
  for (var keys in obj) {
    //if the depth is at lowDepth and they keys == str delete and exit
    if (depth == lowDepth && keys == str) {
      //console.log(obj);
      fixTypeObject(obj);
      return ;
    }
    //if we are lower than the lowDepth just return, because it is not at this
    //level or any level below
    if (depth > lowDepth) {
      return ;
    }
    //recurse over lower objects
    getLowestValue(obj[keys], depth+1, str);
  }
}
function fixTypeObject(obj) {
  if (!obj || typeof(obj) !== "object") return ;
  for (var keys in obj) {
    if (keys == "$ref") {
      delete obj["$ref"];
    }
    fixTypeObject(obj[keys]);
  }
}
//getHighLevel(data, 0, "components");
//onsole.log(lowDepth);

//console.log(JSON.stringify(data));
lowDepth = -1;
/**
*@param obj - the JSON object to be identified
*checks and returns if the object is a swagger, openapi, or neither
**/
function detectType(obj) {
  //if it is not an object, it is not any type of object - so return None
  if (!obj || typeof(obj) !== "object") return "None";
  //If obj[swagger] exists that means it's a swagger file
  if (obj["swagger"]) {
    return "swagger";
  }
  //If obj[openapi] exists that means it's an open API file
  if (obj["openapi"]) {
    return "openapi";
  }
  //if it's neither just return None
  return "None";
}
//detects type for later methods
var ty = detectType(data);
/**
*@param obj - the JSON object being parsed through
*@param depth - The current depth of the object being parsed through
*@param str - the string to be found
**/
function removeHighLevel(obj, depth, str) {
  //don't parse through if it's not an object or is NULL
  if (!obj || typeof(obj) !== "object") return ;
  //if the lowDepth is -1, that means there is no occurrences of str
  if (lowDepth == -1) {
    return ;
  }
  //iterate through they keys of the object
  for (var keys in obj) {
    //if the depth is at lowDepth and they keys == str delete and exit
    if (depth == lowDepth && keys == str) {
      delete obj[keys];
      return ;
    }
    //if we are lower than the lowDepth just return, because it is not at this
    //level or any level below
    if (depth >= lowDepth) {
      return ;
    }
    //recurse over lower objects
    removeHighLevel(obj[keys], depth+1, str);
  }
}

function moveSchema(obj) {
  if (!obj || typeof(obj) !== "object") return ;

  for (var keys in obj) {
    if (keys != "application/json") {
       moveSchema(obj[keys]);
    } else {
      if (obj[keys]["example"]) {
        //obj["example"] = obj[]
        obj["example"] = obj[keys]["example"];
        delete obj[keys]["example"];
      }
    }
  }
}

/**
**/
function removeDefinitions(obj){
  var quotes = 1;
  var start = obj.search('"definitions":{')+15;
  if (start <= 14) {
    return obj;
  }
  var str = ',"definitions":{';
  while (quotes > 0) {
    //console.log(obj[start]);
    if (obj[start] == '{') {
      quotes ++;
    }
    if (obj[start] == '}') {
      quotes --;
    }
    str += obj[start];
    start ++;
  }
  return obj.replace(str, '');
}

/**
*@param {Object} obj - the JSON to be parsed through
*Removes the components aspect of the parser
**/
function removeComponents(obj) {
  var quotes = 1;
  var start = obj.search('"components":{"schema') + 14;
  if (start <= 13) {
    return obj;
  }
  var quotes = 1;
  var str = ',"components":{';
  while (quotes > 0) {
    if (obj[start] == '{') {
      quotes ++;
    }
    if (obj[start] == '}') {
      quotes --;
    }
    str += obj[start];
    start ++;
  }
  return obj.replace(str, '');

}
//Removes Format from the JSON
removeFormat(data, "format");
//wraps the References in the current data JSON
wrapReferences(data);
//Options for the Reference Parser
let options = {
  continueOnError: true,
  parse: {
    json: false,
    yaml: {
      allowEmpty: false
    },
    text: {
      canParse: [".txt", ".html"],
      encoding: "utf16"
    }
  },
  resolve: {
    file: false,
    http: {
      timeout: 2000,
      withCredentials: true,
    }
  },
}
//checks if the object is cyclic
function isCyclic(obj) {
  //sets up they keys/stack/stackSet
  var keys = [];
  var stack = [];
  var stackSet = new Set();
  var detected = false;

  //checks if there is a cycle
  function detect(obj, key) {
    //return if not an object
    if (obj && typeof obj != 'object') { return; }
    //if the stackSet has the original obj it's cyclic
    if (stackSet.has(obj)) {
      //sets detected to true and returns
      detected = true;
      return;
    }
    //pushes the key and object to the keys and stacks
    keys.push(key);
    stack.push(obj);
    stackSet.add(obj);
    //recurse over the children
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) { detect(obj[k], k); }
    }
    //at the end of a recursive call pop all the original parts of the keys/sets
    keys.pop();
    stack.pop();
    stackSet.delete(obj);
    return;
  }
  //detect cycles in the object
  detect(obj, 'obj');
  //returns whether it is detected
  return detected;
}
//Dereferences the entire API including circular references
$RefParser.dereference(data, options, (err, schema) => {
    //logs an error if cannot dereference
    if (err) {
      //logs console.error();
        console.error(err);
    } else {

        //replacer function if there are circular references
        var opt = {replacer:function(value, defaultValue, circular) {
          //console.log(value);
          //checks if circular(the refparser's circular has false positives)
          if (circular) {
            //initializes the string
            var p = "";
            //checks if it is actually cyclic
            if (isCyclic(value)) {
              //console.log('a');
              //sets the prune options so that if it's circular it returns an empty string
              var pruneOptions = {
                //replaces it with an empty string so it isn't in the cycle
                replacer:function(value, defaultValue, circular){
                  if (circular) {
                    checkPrune = true;
                    return prune(value);
                  }
                }
              }
              //calls the prune
              //console.log('a');
            //  p = '"type": "object",'

              p = prune(value, pruneOptions);
            //  console.log("body: {" + p + "}");
              //console.log(p);

              //p = "";
            } else {
              //if there is no circular references just circle
              //p = '"type": "object",'
              //console.log('b');
              p = JSON.stringify(value);
              //p = "body: {" + p + "}";
              //console.log("body: {" + p + "}");
            //console.log(p);
              //p = "";
            }
            //logs this dereference and pruned object back into the JSON
            return p;
          }
          return defaultValue;
        }};

        //creates base json object
        var json = []
        //if there are circular references, prune it with the replacer function
        json = prune(data, opt);
        //removes the definitions object
        //json.replaceAll('"components":', '"definitions":');
        if (ty == 'swagger') {
          json = removeDefinitions(json);
        } else if (ty == 'openapi') {
          json = removeComponents(json);
        }
        //console.log(JSON.parse(json).components);
        //console.log(json == removeComponents(json))

        //Write to a file in this case (Test.json)
        //console.log(JSON.parse(json));
        var temp = JSON.parse(json);
        if (checkPrune) {

          deletePrune(temp);

        }
        cleanJSON(temp);
        deleteExample(temp);
        removeFormat(temp, 'x-codegen-request-body-name');
        json = JSON.stringify(temp);

        //console.log(Object.keys(temp).length);
        //iterateThrough(temp);

        fs.writeFile("test.json", json, function(err) {
          //checks if there is an error
          if (err) {
            //logs the error
            console.log(err);
          }
        });

    }
})
let raw2 = fs.readFileSync('test.json');
let data2 = JSON.parse(raw2);
//console.log(data2);

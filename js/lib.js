var PRODUCTION_MODE = false;
var CLIENT_VER = "0.10";

/**
 * The Project ID of your Google Cloud Storage Project.
 */
var PROJECT = 'recipem-1173';
/**
 * Enter a client ID for a web application from the Google Developers
 * Console on the "APIs & auth", "Credentials" page.
 * In your Developers Console project add a JavaScript origin
 * that corresponds to the domain from where you will be running the
 * script. For more info see:
 * https://developers.google.com/console/help/new/#generatingoauth2
 */
var clientId = '599968053216-mb058jnp0bqiba8b8kbrdienhe9cgpho.apps.googleusercontent.com';
/**
 * Enter the API key from the Google Developers Console, by following these
 * steps:
 * 1) Visit https://cloud.google.com/console and select your project
 * 2) Click on "APIs & auth" in the left column and then click “Credentials”
 * 3) Find section "Public API Access" and use the "API key." If sample is
 * being run on localhost then delete all "Referers" and save. Setting
 * should display "Any referer allowed." For more info see:
 * https://developers.google.com/console/help/new/#generatingdevkeys
 */
var apiKey = 'AIzaSyABJAaNxO5eXyeD66f2le_gjC2zPFYdvz0';
/**
 * To enter one or more authentication scopes, refer to the documentation
 * for the API.
 */
var scopes = 'https://www.googleapis.com/auth/devstorage.full_control';
/**
 * Constants for request parameters. Fill these values in with your custom
 * information.
 */
var API_VERSION = 'v1';
/**
 * Enter a unique bucket name to create a new bucket. The guidelines for
 * bucket naming can be found here:
 * https://developers.google.com/storage/docs/bucketnaming
 */
var BUCKET_PROD = 'img_res';
var BUCKET_DEV = 'img_res_dev';
var BUCKET = (PRODUCTION_MODE)?BUCKET_PROD:BUCKET_DEV;
var IMG_URL_PREFIX = "http://storage.googleapis.com/" + BUCKET + "/";

//Parse Authorizatoin token
var Parse_APP_ID_PROD = "rfIsAJZM19Dh1kOv8eYnHizu8MjrjA6wrFrJOlvn";
var Parse_JS_KEY_PROD = "fcfoBG221xYTkUXsSYhqNa3MnT2nSItyp1NiWAaM";
var Parse_APP_ID_DEV = "CSbJ6ufYjWfpzWJThXInqJ0cxJ0m3eFnBH4YVqOX";
var Parse_JS_KEY_DEV = "91M9yRcIH3Lftz9PuiTepioKTwnfhYjnNg2B8pIU";
var Parse_APP_ID = (PRODUCTION_MODE)?Parse_APP_ID_PROD:Parse_APP_ID_DEV;
var Parse_JS_KEY = (PRODUCTION_MODE)?Parse_JS_KEY_PROD:Parse_JS_KEY_DEV;


function insertObject(fileData) {

	insertObject(fileData, fileData.name, function(resp){
		console.log("File uploaded with following response");
		console.log(resp);
	});
}

function deleteObject(fileName,callback){
	var fileNames = [fileName];
	deleteObjects(fileNames,function(errors){

		if(errors && (errors.length>0)) {
			callback(errors[0]);
		}else {
			callback();
		}
	});
}

function deleteObjects(fileNames,callback){
	var batch = gapi.client.newBatch();

	//Generating a batch for various requests
	for(var i =0; i< fileNames.length;i++) {
		var req = gapi.client.storage.objects.delete({
														'bucket': BUCKET,
														'object':fileNames[i]
													});
		batch.add(req);
	}

	batch.then(
		function(resp){

			//Check if any request in the batch has failed
			var errors = [];
			$.each(resp.result,function(key,value){
				if(value.result.error){
					errors.push(value.result.error);
				}
			});

			//If failed request found, then report the error
			if(errors.length > 0){
				callback(errors);
			}else {
				callback();	//No Error
			}
		},
		function(error){ //Batch execution failed
			callback([error]);
		}
	);
}

function insertObjects(filesData,fileNames,callback) {
    var errors = [];
    insertObjectsRecursive(filesData,fileNames,callback,0,errors);
}

function insertObjectsRecursive(filesData,fileNames,callback,count,errors) {

    insertObject(filesData[count],fileNames[count],function(error){
        if(error) {
            errors.push(error);
        }

        if((count + 1) < fileNames.length) { //Upload next File

            insertObjectsRecursive(filesData,fileNames,callback,count + 1,errors);

        }else { //Upload task for all files finished

            if(errors.length > 0) { //Files uploaded with error
                callback(errors);
            }else { //Files upload successfully
                callback();
            }
        }
    });
}

function insertObject(fileData,fileName,callback) {

	const boundary = '-------314159265358979323846';
	const delimiter = "\r\n--" + boundary + "\r\n";
	const close_delim = "\r\n--" + boundary + "--";

	var reader = new FileReader();
	reader.readAsBinaryString(fileData);
	reader.onload = function(e) {
		var contentType = fileData.type || 'application/octet-stream';
		var metadata = {
			'name': fileName,			//Specifying FileName here
			'mimeType': contentType,
		};
		var base64Data = btoa(reader.result);
		var multipartRequestBody =
		delimiter +
		'Content-Type: application/json\r\n\r\n' +
		JSON.stringify(metadata) +
		delimiter +
		'Content-Type: ' + contentType + '\r\n' +
		'Content-Transfer-Encoding: base64\r\n' +
		'\r\n' +
		base64Data +
		close_delim;

		//Note: gapi.client.storage.objects.insert() can only insert
		//small objects (under 64k) so to support larger file sizes
		//we're using the generic HTTP request method gapi.client.request()
		var request = gapi.client.request({
										  'path': '/upload/storage/' + API_VERSION + '/b/' + BUCKET + '/o',
										  'method': 'POST',
										  'params': {'uploadType': 'multipart'},
										  'headers': {
										  'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'},
										  'body': multipartRequestBody
										  });

		request.execute(function(resp,raw_resp) {
            if(resp['mediaLink'] && (resp['mediaLink'].length > 0)) {
                //Image uploaded succesfully
                callback();
            }else {
                //There was some error uploading image
                callback(resp);
            }

		});
	}
}

function resizeImage(fileData,maxWidth,maxHeight,callback) {

    // Create an image
    var img = document.createElement("img");
    // Create a file reader
    var reader = new FileReader();
    // Set the image once loaded into file reader
    reader.onload = function(e)
    {
        img.src = e.target.result;

        var canvas = document.createElement("canvas");
        //var canvas = $("<canvas>", {"id":"testing"})[0];
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        var MAX_WIDTH = maxWidth;
        var MAX_HEIGHT = maxHeight;
        var width = img.width;
        var height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        var dataurl = canvas.toDataURL("image/jpeg",0.7);
        var file = dataURItoBlob(dataurl);
        callback(file);
    }

    // Load files into file reader
    reader.readAsDataURL(fileData);
}

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}



function updateImgElemFromFile(imgElem,file){

	//Setup the fileReader
	var reader = new FileReader();
	reader.onload = function (e) {
		imgElem.attr('src', e.target.result);
	}

	reader.readAsDataURL(file);
}


/**
 * Set required API keys and check authentication status.
 */
function handleClientLoad() {
	bgAuthDone = false;
	gapi.client.setApiKey(apiKey);
	//gapi.auth.init(doAuthorization(true));
	initializeApi();
    authSuccessHandle();
}

/**
 * Authorize Google Cloud Storage API.
 */
function doAuthorization(inBackground) {
	gapi.auth.authorize({
						client_id: clientId,
						scope: scopes,
						immediate: inBackground
						}, handleAuthResult);
}

/**
 * Handle authorization.
 */
var bgAuthDone = false;
function handleAuthResult(authResult) {

	if (authResult && !authResult.error) {//Auth succeeded
		bgAuthDone = true;

		initializeApi();
		console.log("Authorization succeeded");

		//Call the authSuccessHandle
		if(authSuccessHandle){
			authSuccessHandle();
		}else {
			console.log("Auth Success Handle not defined");
		}

	} else { //Auth Failed

		if(!bgAuthDone) { //If Only BG Auth has been tried
			bgAuthDone = true;
			console.log("Background Authorization failed");

			//Do Authorization in UserInput
			console.log("Doing Authorization with User Feedback");
			doAuthorization(false);

		}else { //All possible authorization failed

			console.log("Authorization failed");

			//Call the authFailureHandle
			if(authFailureHandle){
				authFailureHandle();
			}else {
				console.log("Auth Failure Handle not defined");
			}
		}

	}
}

/**
 * Load the Google Cloud Storage API.
 */
function initializeApi() {
	gapi.client.load('storage', API_VERSION);
}



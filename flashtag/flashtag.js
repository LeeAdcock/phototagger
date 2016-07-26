#!/usr/bin/env node
var gcloud = require('gcloud')({
  projectId: 'flashtag-1383',

  // The path to your key file:
  keyFilename: 'keyfile.json',

  // Or the contents of the key file:
  credentials: require('./keyfile.json')
});

var vision = gcloud.vision();
var storage = gcloud.storage();
var datastore = gcloud.datastore();

var retrieveAccountKey = function(username, callback) {
    var accountKey = datastore.key(['account', username]);
    datastore.get(accountKey, function(err, entity) {
        // If this tag isn't defined, create it
        if(!entity) {
            datastore.save({
                key: accountKey,
                data: {
                    username: username
                }
            }, function(err) {
              if (!err) {
                // Record saved successfully.
                callback(accountKey);
              }
              console.log(err); //todo
            });
        } else {
            // todo store association between photo and tag
            callback(accountKey);
        }
    });
};

var retrieveTagKey = function(tag, callback) {
    // todo cache tags we already know about
    // is this label something we already have a tag created for?
    var tagKey = datastore.key(['tag', tag]);
    datastore.get(tagKey, function(err, entity) {
        // If this tag isn't defined, create it
        if(!entity) {
            datastore.save({
                key: tagKey,
                data: {
                    name: tag
                }
            }, function(err) {
              if (!err) {
                // Record saved successfully.
                callback(tagKey);
              }
              console.log(err); //todo
            });
        } else {
            // todo store association between photo and tag
            callback(tagKey);
        }
    });
};

var username = 'leeadcock';
var accountKey = retrieveAccountKey(username, function(accountKey){
    
// Reference an existing bucket.
var bucket = storage.bucket('flashtag-photos');
bucket.getFiles()
  .on('error', console.error)
  .on('data', function(file) {

    // save a reference to this file in the datastore
    var photoKey = datastore.key(['photo'], username, file.id);
    datastore.save({
      key: photoKey,
      data: {
        filename: file.id,
      }
    }, function(err, entity) {
      // photo id = entity.mutationResults[0].key.path[0].id
      if (!err) {

        // get face and label information for this file
        vision.detect(file, ['face', 'label'], function(err, detections) {

            detections.faces.forEach(function(face) {
                datastore.save({
                    key: datastore.key(['face', username, file.id]),
                    data: face
                }, function(err) { 
                    if(err) {
                        console.log(err) //todo
                    }
                });

                ['happy', 'hat', 'mad', 'sad', 'surprised'].forEach(function(property) {
                    if(face[property]) {
                        addTagToPhoto(photoKey, property);
                    }
                });
            });

            // for each item detected
            detections.labels.forEach(function(tag) {
                addTagToPhoto(photoKey, tag)
            });
            
          });
        }
    });
  })
  .on('end', function() {
    // All files retrieved.
    console.log('end');
  });
});

var addTagToPhoto = function(photoKey, tag) {
    retrieveTagKey(tag, function(tagKey) {
        datastore.save({
            key: datastore.key(['photoTagRelationship', photoKey]),
            data: {
                photo: photoKey,
                tag: tagKey,
                automated: true
            }
        }, function(err) { 
            if(err) {
                console.log(err) //todo
            }
        });
    });
}
  

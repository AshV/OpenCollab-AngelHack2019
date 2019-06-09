/*
 * JS Interface for Agora.io SDK
 */

// video profile settings
var cameraVideoProfile = '480p_4'; // 640 × 480 @ 30fps  & 750kbs
var screenVideoProfile = '480p_2'; // 640 × 480 @ 30fps

// create client instances for camera (client) and screen share (screenClient)
var client = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'}); 
var screenClient = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'}); 

// stream references (keep track of active streams) 
var remoteStreams = {}; // remote streams obj struct [id : stream] 

var localStreams = {
  camera: {
    id: "",
    stream: {}
  },
  screen: {
    id: "",
    stream: {}
  }
};

var mainStreamId; // reference to main stream
var screenShareActive = false; // flag for screen share 

function initClientAndJoinChannel(agoraAppId, channelName) {
  // init Agora SDK
  client.init(agoraAppId, function () {
    console.log("AgoraRTC client initialized");
    joinChannel(channelName); // join channel upon successfull init
  }, function (err) {
    console.log("[ERROR] : AgoraRTC client init failed", err);
  });
}


client.on('stream-published', function (evt) {
  console.log("Publish local stream successfully");
});

// connect remote streams
client.on('stream-added', function (evt) {
  var stream = evt.stream;
  var streamId = stream.getId();
  console.log("new stream added: " + streamId);
  // Check if the stream is local
  if (streamId != localStreams.screen.id) {
    console.log('subscribe to remote stream:' + streamId);
    // Subscribe to the stream.
    client.subscribe(stream, function (err) {
      console.log("[ERROR] : subscribe stream failed", err);
    });
  }
});

client.on('stream-subscribed', function (evt) {
  var remoteStream = evt.stream;
  var remoteId = remoteStream.getId();
  remoteStreams[remoteId] = remoteStream;
  console.log("Subscribe remote stream successfully: " + remoteId);
  if( $('#full-screen-video').is(':empty') ) { 
    mainStreamId = remoteId;
    remoteStream.play('full-screen-video');
  } else {
    addRemoteStreamMiniView(remoteStream);
  }
});

// remove the remote-conts when a user leaves the channel
client.on("peer-leave", function(evt) {
  var streamId = evt.stream.getId(); // the the stream id
  if(remoteStreams[streamId] != undefined) {
    remoteStreams[streamId].stop(); // stop playing the feed
    delete remoteStreams[streamId]; // remove stream from list
    if (streamId == mainStreamId) {
      var streamIds = Object.keys(remoteStreams);
      var randomId = streamIds[Math.floor(Math.random()*streamIds.length)]; // select from the remaining streams
      remoteStreams[randomId].stop(); // stop the stream's existing playback
      var remotecontsID = '#' + randomId + '_conts';
      $(remotecontsID).empty().remove(); // remove the stream's miniView conts
      remoteStreams[randomId].play('full-screen-video'); // play the random stream as the main stream
      mainStreamId = randomId; // set the new main remote stream
    } else {
      var remotecontsID = '#' + streamId + '_conts';
      $(remotecontsID).empty().remove(); // 
    }
  }
});

// show mute icon whenever a remote has muted their mic
client.on("mute-audio", function (evt) {
  toggleVisibility('#' + evt.uid + '_mute', true);
});

client.on("unmute-audio", function (evt) {
  toggleVisibility('#' + evt.uid + '_mute', false);
});

// show user icon whenever a remote has disabled their video
client.on("mute-video", function (evt) {
  var remoteId = evt.uid;
  // if the main user stops their video select a random user from the list
  if (remoteId != mainStreamId) {
    // if not the main vidiel then show the user icon
    toggleVisibility('#' + remoteId + '_no-video', true);
  }
});

client.on("unmute-video", function (evt) {
  toggleVisibility('#' + evt.uid + '_no-video', false);
});

// join a channel
function joinChannel(channelName) {
  var token = generateToken();
  var userID = null; // set to null to auto generate uid on successfull connection
  client.join(token, channelName, userID, function(uid) {
      console.log("User " + uid + " join channel successfully");
      createCameraStream(uid);
      localStreams.camera.id = uid; // keep track of the stream uid 
  }, function(err) {
      console.log("[ERROR] : join channel failed", err);
  });
}

// video streams for channel
function createCameraStream(uid) {
  navigator.mediaDevices.getUserMedia(
    {video: true, audio: true}
).then(function(mediaStream){
    var videoSource = mediaStream.getVideoTracks()[0];
    var audioSource = mediaStream.getAudioTracks()[0];
    
    // After processing videoSource and audioSource
    var localStream = AgoraRTC.createStream({
        video: true,
        audio: true,
        videoSource: videoSource,
        audioSource: audioSource
    });

  localStream.setVideoProfile(cameraVideoProfile);
  localStream.init(function() {
    console.log("getUserMedia successfully");
    // TODO: add check for other streams. play local stream full size if alone in channel
    localStream.play('local-video'); // play the given stream within the local-video div

    // publish local stream
    client.publish(localStream, function (err) {
      console.log("[ERROR] : publish local stream error: " + err);
    });
  
    enableUiControls(localStream); // move after testing
    localStreams.camera.stream = localStream; // keep track of the camera stream for later
  }, function (err) {
    console.log("[ERROR] : getUserMedia failed", err);
  });

});
}

// SCREEN SHARING
function initScreenShare() {
  screenClient.init(agoraAppId, function () {
    console.log("AgoraRTC screenClient initialized");
    joinChannelAsScreenShare();
    screenShareActive = true;
    // TODO: add logic to swap button
  }, function (err) {
    console.log("[ERROR] : AgoraRTC screenClient init failed", err);
  });  
}

function joinChannelAsScreenShare() {
  var token = generateToken();
  var userID = null; // set to null to auto generate uid on successfull connection
  screenClient.join(token, channelName, userID, function(uid) { 
    localStreams.screen.id = uid;  // keep track of the uid of the screen stream.
    
    // Create the stream for screen sharing.
    var screenStream = AgoraRTC.createStream({
      streamID: uid,
      audio: false, // Set the audio attribute as false to avoid any echo during the call.
      video: false,
      screen: true, // screen stream
      extensionId: 'minllpmhdgpndnkomcoccfekfegnlikg', // Google Chrome:
      mediaSource:  'screen', // Firefox: 'screen', 'application', 'window' (select one)
    });
    screenStream.setScreenProfile(screenVideoProfile); // set the profile of the screen
    screenStream.init(function(){
      console.log("getScreen successful");
      localStreams.screen.stream = screenStream; // keep track of the screen stream
      $("#screen-share-btn").prop("disabled",false); // enable button
      screenClient.publish(screenStream, function (err) {
        console.log("[ERROR] : publish screen stream error: " + err);
      });
    }, function (err) {
      console.log("[ERROR] : getScreen failed", err);
      localStreams.screen.id = ""; // reset screen stream id
      localStreams.screen.stream = {}; // reset the screen stream
      screenShareActive = false; // resest screenShare
      toggleScreenShareBtn(); // toggle the button icon back (will appear disabled)
    });
  }, function(err) {
    console.log("[ERROR] : join channel as screen-share failed", err);
  });

  screenClient.on('stream-published', function (evt) {
    console.log("Publish screen stream successfully");
    localStreams.camera.stream.disableVideo(); // disable the local video stream (will send a mute signal)
    localStreams.camera.stream.stop(); // stop playing the local stream
    // TODO: add logic to swap main video feed back from conts
    remoteStreams[mainStreamId].stop(); // stop the main video stream playback
    addRemoteStreamMiniView(remoteStreams[mainStreamId]); // send the main video stream to a conts
    // localStreams.screen.stream.play('full-screen-video'); // play the screen share as full-screen-video (vortext effect?)
    $("#video-btn").prop("disabled",true); // disable the video button (as cameara video stream is disabled)
  });
  
  screenClient.on('stopScreenSharing', function (evt) {
    console.log("screen sharing stopped", err);
  });
}

function stopScreenShare() {
  localStreams.screen.stream.disableVideo(); // disable the local video stream (will send a mute signal)
  localStreams.screen.stream.stop(); // stop playing the local stream
  localStreams.camera.stream.enableVideo(); // enable the camera feed
  localStreams.camera.stream.play('local-video'); // play the camera within the full-screen-video div
  $("#video-btn").prop("disabled",false);
  screenClient.leave(function() {
    screenShareActive = false; 
    console.log("screen client leaves channel");
    $("#screen-share-btn").prop("disabled",false); // enable button
    screenClient.unpublish(localStreams.screen.stream); // unpublish the screen client
    localStreams.screen.stream.close(); // close the screen client stream
    localStreams.screen.id = ""; // reset the screen id
    localStreams.screen.stream = {}; // reset the stream obj
  }, function(err) {
    console.log("client leave failed ", err); //error handling
  }); 
}

// REMOTE STREAMS UI
function addRemoteStreamMiniView(remoteStream){
  var streamId = remoteStream.getId();
  // append the remote stream template to #remote-streams
  $('#remote-streams').append(
    $('<div/>', {'id': streamId + '_conts',  'class': 'remote-stream-conts col'}).append(
      $('<div/>', {'id': streamId + '_mute', 'class': 'mute-overlay'}).append(
          $('<i/>', {'class': 'fas fa-microphone-slash'})
      ),
      $('<div/>', {'id': streamId + '_no-video', 'class': 'no-video-overlay text-center'}).append(
        $('<i/>', {'class': 'fas fa-user'})
      ),
      $('<div/>', {'id': 'agora_remote_' + streamId, 'class': 'remote-video'})
    )
  );
  remoteStream.play('agora_remote_' + streamId); 

  var contsId = '#' + streamId + '_conts';
  $(contsId).dblclick(function() {
    // play selected conts as full screen - swap out current full screen stream
    remoteStreams[mainStreamId].stop(); // stop the main video stream playback
    addRemoteStreamMiniView(remoteStreams[mainStreamId]); // send the main video stream to a conts
    $(contsId).empty().remove(); // remove the stream's miniView conts
    remoteStreams[streamId].stop() // stop the conts's video stream playback
    remoteStreams[streamId].play('full-screen-video'); // play the remote stream as the full screen video
    mainStreamId = streamId; // set the conts stream id as the new main stream id
  });
}

function leaveChannel() {
  
  if(screenShareActive) {
    stopScreenShare();
  }

  client.leave(function() {
    console.log("client leaves channel");
    localStreams.camera.stream.stop() // stop the camera stream playback
    client.unpublish(localStreams.camera.stream); // unpublish the camera stream
    localStreams.camera.stream.close(); // clean up and close the camera stream
    $("#remote-streams").empty() // clean up the remote feeds
    //disable the UI elements
    $("#mic-btn").prop("disabled", true);
    $("#video-btn").prop("disabled", true);
    $("#screen-share-btn").prop("disabled", true);
    $("#exit-btn").prop("disabled", true);
    // hide the mute/no-video overlays
    toggleVisibility("#mute-overlay", false); 
    toggleVisibility("#no-local-video", false);
    // show the modal overlay to join
    $("#modalForm").modal("show"); 
  }, function(err) {
    console.log("client leave failed ", err); //error handling
  });
}

// use tokens for added security
function generateToken() {
  return null; // TODO: add a token generation
}

// chat

const e = document.getElementById("adoCont");
updateScroll(e);
function updateScroll(e){
  e.scrollTop = e.scrollHeight;
}

var firebaseConfig = {
  apiKey: "api-key",
  authDomain: "project-id.firebaseapp.com",
  databaseURL: "https://outlaystore.firebaseio.com",
  projectId: "project-id",
  storageBucket: "project-id.appspot.com",
  messagingSenderId: "sender-id",
  appID: "app-id",
};
var defaultProject = firebase.initializeApp(firebaseConfig);

var url_string = window.location.href; //window.location.href
var url = new URL(url_string);
var c = url.searchParams.get("m");
var chats = firebase.database().ref('AH19/'+ c+ '/');
chats.on('value', function (snapshot) {
  // Use this value
  console.log(snapshot.val());
  console.log(snapshot);
  const t = (snapshot.val());
  for(i in t)
  {
    console.log(i);
    const c = document.getElementById('adoCont');
  const g = document.createElement('div');
  const cls = document.createAttribute('class');
  cls.value = "msg lft";
  g.setAttributeNode(cls);
  const r = document.createElement('div');
  const clas = document.createAttribute('class');
  clas.value = "hdng";
  r.setAttributeNode(clas);
  let user, msg;
    for(j in t[i])
    {
      //console.log(j);
      
      if(j=== 'name')
      {
        console.log(t[i][j]);
        user = document.createTextNode(t[i][j]);
      }
      if(j === l)
      {  
        console.log(t[i][j]);
        msg = document.createTextNode(t[i][j]);
      }
    }
      r.appendChild(user);
  g.appendChild(r);
  g.appendChild(msg);
  c.appendChild(g);
  updateScroll(e);
    console.log(i.name);
  }
});
// setInterval(function(){
//   console.log('hi');
//   const c = document.getElementById('adoCont');
//   const g = document.createElement('div');
//   const cls = document.createAttribute('class');
//   cls.value = "msg lft";
//   g.setAttributeNode(cls);
//   const r = document.createElement('div');
//   const clas = document.createAttribute('class');
//   clas.value = "hdng";
//   r.setAttributeNode(clas);
//   const user = document.createTextNode('Rohan');
//   const msg = document.createTextNode('Whats going on?');
//   r.appendChild(user);
//   g.appendChild(r);
//   g.appendChild(msg);
//   c.appendChild(g);
//   updateScroll(e);
// }, 3000);

// setInterval(function(){
//   console.log('hi');
//   const c = document.getElementById('adoCont');
//   const g = document.createElement('div');
//   const cls = document.createAttribute('class');
//   cls.value = "msg rgt";
//   g.setAttributeNode(cls);
//   const r = document.createElement('div');
//   const clas = document.createAttribute('class');
//   clas.value = "hdng";
//   r.setAttributeNode(clas);
//   const user = document.createTextNode('You');
//   const msg = document.createTextNode('Nothing! You tell!');
//   r.appendChild(user);
//   g.appendChild(r);
//   g.appendChild(msg);
//   c.appendChild(g);
//   updateScroll(e);
// }, 3000);

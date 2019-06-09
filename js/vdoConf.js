// import AgoraRTC from 'agora-rtc-sdk'

var client = AgoraRTC.createClient({mode: 'live', codec: "h264"});
client.init('9f651666e50b4cb9917d1b26acda5da6', function () {
    console.log("AgoraRTC client initialized");
  
  }, function (err) {
    console.log("AgoraRTC client init failed", err);
  });
  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  let userid;
  client.join('0069f651666e50b4cb9917d1b26acda5da6IAAIE6/kF0cAe/QzPAtsPSHZBgbPFNahawLxH/AJGuSjBzLRTXgAAAAAEADvSg8heCT9XAEAAQB4JP1c', 'Test', getRandomInt(10), function(uid) {
    console.log("User " + uid + " join channel successfully");
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
    localStream.init(function(){
        client.publish(localStream, function(e){
            //...
        });
    });
    localStream.init(function() {
        console.log("getUserMedia successfully");
        localStream.play('agora_local');
      
      }, function (err) {
        console.log("getUserMedia failed", err);
      });
      client.publish(localStream, function (err) {
        console.log("Publish local stream error: " + err);
      });
      
      client.on('stream-published', function (evt) {
        console.log("Publish local stream successfully");
      });
      client.on('stream-added', function (evt) {
        var stream = evt.stream;
        console.log("New stream added: " + stream.getId());
      
        client.subscribe(stream, function (err) {
          console.log("Subscribe stream failed", err);
        });
      });
      client.on('stream-subscribed', function (evt) {
        var remoteStream = evt.stream;
        console.log("Subscribe remote stream successfully: " + remoteStream.getId());
        remoteStream.play('agora_remote' + remoteStream.getId());
      })
      localStream.init(function() {
        console.log("getUserMedia successfully");
        // Use agora_local as the ID of the dom element
        localStream.play('agora_local');
  
    }, function (err) {
        console.log("getUserMedia failed", err);
        client.on('stream-subscribed', function (evt) {
            var remoteStream = evt.stream;
            console.log("Subscribe remote stream successfully: " + remoteStream.getId());
            // Use agora_remote + remoteStream.getId() as the ID of the dom element
            remoteStream.play('agora_remote' + remoteStream.getId());
          })
});
    // localStream = AgoraRTC.createStream({
    //     streamID: uid,
    //     audio: true,
    //     video: true,
    //     screen: false}
    //   );
     
});
  client.leave(function () {
    console.log("Leave channel successfully");
  }, function (err) {
    console.log("Leave channel failed");
  });
  client.getSessionStats((stats) => {
    console.log(`Current Session Duration: ${stats.Duration}`);
    console.log(`Current Session UserCount: ${stats.UserCount}`);
    console.log(`Current Session SendBytes: ${stats.SendBytes}`);
    console.log(`Current Session RecvBytes: ${stats.RecvBytes}`);
    console.log(`Current Session SendBitrate: ${stats.SendBitrate}`);
    console.log(`Current Session RecvBitrate: ${stats.RecvBitrate}`);
});
  }, function(err) {
    console.log("Join channel failed", err);
  });


  client.on('stream-added', function (evt) {
    var stream = evt.stream;
    console.log("New stream added: " + stream.getId());
  
    client.subscribe(stream, function (err) {
      console.log("Subscribe stream failed", err);
    });
  });
  client.on('stream-subscribed', function (evt) {
    var remoteStream = evt.stream;
    console.log("Subscribe remote stream successfully: " + remoteStream.getId());
    remoteStream.play('agora_remote' + remoteStream.getId());
  })
  localStream.init(function() {
    console.log("getUserMedia successfully");
    // Use agora_local as the ID of the dom element
    localStream.play('agora_local');

}, function (err) {
    console.log("getUserMedia failed", err);
    client.on('stream-subscribed', function (evt) {
        var remoteStream = evt.stream;
        console.log("Subscribe remote stream successfully: " + remoteStream.getId());
        // Use agora_remote + remoteStream.getId() as the ID of the dom element
        remoteStream.play('agora_remote' + remoteStream.getId());
      })
});

  // Sets the client role to “host” or “audience”.
client.setClientRole("client", function() {
    console.log("setHost success");
  }, function(e) {
    console.log("setHost failed", e);
  })
  
  
  
  // The client-role-changed callback.
  client.on("client-role-changed", function(evt) {
    console.log("client-role-changed", evt.role);
  });
  

  

 
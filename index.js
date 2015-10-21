var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');
var Channel = require('./channel.js');
var Message = require('./message.js');

var users = 0;
var rooms = {};

app.use(express.static(__dirname + '/sounds'));
app.use(express.static(__dirname + '/public'));

app.get('/*', function(req, res){
  res.sendFile(__dirname + '/public/room.html');
});

io.on('connection', function(socket){
  users++;
  //var id = checkUrl(socket.request.headers.referer); //get room id from Get
  ch = new Channel("Uus kannu :D");
  ch.addUser(socket.id);
  ch.addMessage("Hello world!");
  id = ch.getId();
  rooms[id] = ch;

  console.log("room: " + id + ", u: " + rooms[id].getNumberOfUsers());


  socket.join(id);
  io.emit('osallistujia', rooms[id]);
  io.emit('huone', id);

  socket.on('haeViestit', function(id){
    var i = rooms[id].getMessages(5);
  });

  socket.on('sendMessage', function(msg){
    var date = new Date()
    var message = new Message(msg.contents, msg.sender, date.toLocaleTimeString());
    console.log(message.getContents());
    io.emit('newMessage', message);
  });

  socket.on('disconnect', function(){
    users--;
  });
});

function checkUrl(address){
  var path = url.parse(address).pathname.split('/');
  //väärän kokoinen osoite
  if(path.length != 3){
    return "DEFAULT";
  }
  //palautetaan huoneen id
  if(path[1] == "room"){
    return path[2];
  }
}

http.listen(3000, function(){
  console.log('kuunnellaan: 3000');
});

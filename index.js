var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = 0;
app.use(express.static('sounds'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  users++;

  io.emit('soittajia', users);
  console.log('user connected');

  socket.on('painallus', function(key){
    io.emit('painallus', key);
  });

  socket.on('disconnect', function(){
    users--;
    console.log('user disconnected');
  });
});
http.listen(3000, function(){
  console.log('kuunnellaan *:3000');

});

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('sounds'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/sounds/*', function(req, res){
  res.sendFile(__dirname + '/index.html');
  console.log('haluttiin ääntä');
});

io.on('connection', function(socket){
  console.log('connected:');
  socket.on('viesti', function(msg){
    io.emit('viesti', msg);
    console.log('message: ' + msg);
  });
  socket.on('painallus', function(key){
    io.emit('painallus', key);
  })
});
http.listen(3000, function(){
  console.log('kuunnellaan *:3000');

});

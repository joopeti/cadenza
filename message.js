function Message(contents, sender, timestamp){
  this.contents = contents;
  this.sender = sender;
  this.timestamp = timestamp;
};

Message.prototype.print = function(){
  return this.timestamp + " " + this.sender + ": " + this.contents;
}

Message.prototype.getContents = function(){
  return this.contents;
}
Message.prototype.getSender = function(){
  return this.sender;
}
Message.prototype.getTimestamp = function(){
  return this.timestamp;
}

module.exports = Message;

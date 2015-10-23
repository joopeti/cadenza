function Queue() {
  this.inbox = [];
  this.outbox = [];
  this.size = 0;
}

Queue.prototype.push = function (value) {
  this.inbox.push(value);
  this.size++;
};

Queue.prototype.pop = function () {
  if (!this.outbox.length) {
    if (!this.inbox.length) {
      return undefined;
    }
    while (this.inbox.length) {
      this.outbox.push(this.inbox.pop());
    }
  }
  this.size--;
  return this.outbox.pop();
};
Queue.prototype.len = this.size;

Queue.prototype.asArray = function(){
  var array = [];
  for (var i = this.outbox.length; i > 0 ; i--) {
    array.push(this.outbox[i]);
  }
  for (var i = 0; i < this.inbox.length; i++) {
    array.push(this.inbox[i]);
  }
  return array;
}

module.exports = Queue;

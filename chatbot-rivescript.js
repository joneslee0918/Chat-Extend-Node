var _ = require('underscore');
var RiveScript = require('rivescript');
var ChatContext = require('./lib/chat-context.js');

module.exports = function(RED) {

  function ChatBotRivescript(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.script = config.script;
    this.answer = config.answer;
    this.parse_mode = config.parse_mode;
    this.transports = ['telegram', 'slack', 'facebook'];

    this.on('input', function(msg) {
      var script = node.script;
      var originalMessage = msg.originalMessage;
      var chatId = msg.payload.chatId || (originalMessage && originalMessage.chat.id);
      var context = node.context();
      var chatContext = context.global.get('chat:' + chatId);
      var content = msg.payload != null && msg.payload.content != null ? msg.payload.content : null;

      var bot = new RiveScript({utf8: true, debug: false});
      if (chatContext != null) {
        // anything that is not string printable
        bot.setUservars('local-user', _(chatContext.all()).mapObject(function(value) {
          return _.isString(value) || _.isNumber(value) || _.isArray(value) ? value : null;
        }));
      }
      bot.stream(script);
      bot.sortReplies();
      var reply = bot.reply('local-user', content);

      if (reply.match(/^ERR:/)) {
        msg.payload = {content: reply};
        node.send([null, msg]);
      } else {
        if (chatContext != null) {
          // set the vars back
          var replyVars = bot.getUservars('local-user');
          chatContext.set(_(replyVars).omit('topic', '__initialmatch__', '__history__', '__lastmatch__'));
        }
        // payload
        msg.payload = reply;
        // send out reply
        node.send([msg, null]);
      }

    });
  }

  RED.nodes.registerType('chatbot-rivescript', ChatBotRivescript);
};

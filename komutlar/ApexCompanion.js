const EventEmitter = require('events');
const Discord = require('discord.js');

const fs = require('fs'), path = require('path'), util = require('util'), readdir = util.promisify(fs.readdir);
const Storage = require('node-storage');

class ApexCompanion extends EventEmitter {
  constructor(client) {
    super();
    this.storage = new Storage(path.join(__dirname, '../data/apex.json'));

    this.Discord = Discord;
    this.client = client;

    this.commands = [];
    this.modules = [];
  }

  _readdir(x) {
    return new Promise((resolve, reject) => {
      fs.readdir(x, function (err, dir) {
        if (err) return reject(err);
        resolve(dir);
      });
    });
  }

  async load() {
    console.log('Loading - started');
    if (!this.storage.get('prefix')) {
      this.storage.put('administration', { owner: '98840465624809472', groups: [{ id: '375010276489297920', level: 1 }, { id: '375009917968318495', level: 2 }] });
      this.storage.put('prefix', '!');
    }

    let dir = (await this._readdir(path.join(__dirname, '../modules'))).filter(x => x.slice(-3) === '.js');

    for (let i = 0; i < dir.length; i++) {
      try {
        console.log('[Modules] Loading ' + './modules/' + dir[i]);

        let module = new (require(path.join(__dirname, '../modules/', dir[i])))();
        this.modules.push(module);

        // Let's hook onXXEvent methods to Discord.js events
        Object.getOwnPropertyNames(Object.getPrototypeOf(module)).filter(x => x.startsWith('on') && x.slice(-5) === 'Event').map(x => [x, x.slice(2, -5).toLowerCase()]).forEach(x => {
          console.log(`[Modules] Hooking ${module.name}#${x[0]} to ${x[1]} event`);
          console.dir(x);

          this.client.on(x[1], module[x[0]]);
        });
      }
      catch(err) {
        console.error(err);
      }
    }

    console.log('Loading - done');
  }

  async onReady(client) {
    this.guild = client.guilds.find(x => x.id === '263831002382598144');
    this.client.user.setActivity('!apex-info', { type: 'LISTENING' });

    console.log('Loading all modules');
    const d = await Promise.all(this.modules.map(x => x.start(this)));

    this.modules.forEach(x => {
      this.commands = this.commands.concat(x.commands);
    });

    console.log('Loaded all modules');
  }

  onMessage(message) {
    if(message.author.bot) return;
    if(message.content.indexOf(this.storage.get('prefix')) !== 0) return;

    const args = message.content.slice(this.storage.get('prefix').length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    console.dir(args);
    console.dir(command);
    console.dir(this.commands);

    for (var i = 0; i < this.commands.length; i++) {
      if (this.commands[i].prefixes.every(x => !command.startsWith(x)))
        continue;

      /*if (!hasRole(this.guild.members.find('id', message.author.id).highestRole.id, this.commands[i].permissions) && message.author.id !== this.storage.get('administration').owner) {
        console.log('Required roles: level ' + this.commands[i].permissions + ' for ' + message.author.username);
        continue;
      }*/

      console.log('Executed command: \'' + message.content + '\' by ' + message.author.username);
      this.commands[i].handler(message, args);

      if (this.commands[i].delete)
        message.delete();

      return;
    }
  }

  hasRole(id, level) {
    var groups = this.storage.get('administration').groups;

    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === id && groups[i].level === level) return true;
    }

    return false;
  }

  async shutdown() {

  }
}

module.exports = ApexCompanion;

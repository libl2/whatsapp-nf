const http = require('http');
const express = require('express');
const qrcode = require('qrcode-terminal');
const configfile = require('./config.json');
const moment = require('moment-timezone');
const uuid = require('uuid');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const path = require('path');
const app = express();
const server = http.createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server);

const worker = `auth/session/Default/Service Worker`;

const corsOptions = {
  origin: "http://localhost:4000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.use('/files', express.static(path.join(__dirname, 'downloads')));

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: 'auth'
  }),
  puppeteer: {
    headless: false,
    executablePath: configfile.PathToChrome,
    args: ['--no-sandbox']
  }
});

if (fs.existsSync(worker)) {
  fs.rmSync(worker, { recursive: true });
}

io.on('connection', function (socket) {
  // קוד הקשור לסוקטים
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});

client.on('message', async (msg) => {
  const timestampIsrael = moment.unix(msg.timestamp).tz('Asia/Jerusalem');

  const messageData = {
    timestamp: timestampIsrael.format('YYYY-MM-DD HH:mm:ss'),
    from: msg.from,
    body: msg.body
  };

  if (msg.hasMedia) {
    try {
      let media = await msg.downloadMedia();
      if (media) {
        const mediaType = msg.type;
        const extension = mediaType === 'image' ? 'jpg' : 'mp4';
        const fileName = filename(media.filename, extension);

        fs.writeFile(
          `./downloads/${fileName}`,
          media.data,
          "base64",
          function (err) {
            if (err) {
              console.log(err);
            }
          }
        );

        messageData.file = `${fileName}`;
      }
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  }

  io.emit('receivedMessage', messageData);

  if (messageData.file) {
    messageData.file = `file://${configfile.PathPogram}/${messageData.file}`;
  }

  console.log(messageData);
});

client.initialize();

function filename(file, extension) {
  if (file) {
    return file;
  } else {
    return `${uuid.v4()}.${extension}`;
  }
}

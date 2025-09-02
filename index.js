var express = require('express');
var cors = require('cors');
var app = express();
require('dotenv').config();
let multer = require('multer')
let AWS = require('aws-sdk')
let fs = require('fs')
let mongoose = require('mongoose');
const { error } = require('console');



mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
})


const fileSchema = new mongoose.Schema({
  filename: String,
  mimetype: String,
  size: Number,
  url: String,
  uploadDate: {
    type: Date,
    default: Date.now
  }
})

const File = mongoose.model('File', fileSchema)
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY, 
  region: process.env.REGION
})


app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));

const upload = multer({storage: multer.memoryStorage()});

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/fileanalyse', upload.single('upfile'), (req, res) => {
  res.json({
    "name": req.file.originalname,
    "type": req.file.mimetype,
    "size": req.file.size
  })
})

app.post('/upload', upload.single('upfile'), async (req, res) => {
  const params = {
    Bucket: process.env.BUCKET,
    Key: Date.now() + '-' + req.file.originalname,
    Body: req.file.buffer
  };

  s3.upload(params, async(err, data)=>{
    if (err) return res.status(500).send(err);

    const newFile = new File({
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: data.Location
    });

    await newFile.save();
    res.json({message: 'File uploaded!', file: newFile});
  })
})

app.get('/files', async(req, res) => {
  const files = await File.find();
  res.json(files)
})



const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Your app is listening on port ' + port)
});

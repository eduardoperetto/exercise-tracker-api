const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Body-Parser
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// DB Settings
var mongoose = require('mongoose');
const mySecret = process.env['MONGO_URI'];

mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

const { Schema } = mongoose;

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
});

const userSchema = new Schema({
  username: { type: String, required: true }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

const User = mongoose.model('User', userSchema);

// Routes
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/users', function(req, res) {
  User.find({}, function(err, docs) {
    res.json(docs);
  });
});

app.get('/api/users/:_id/logs', function(req, res) {
  let idToSearch = req.params['_id'];
  let fromParam = req.query.from;
  let toParam = req.query.to;
  let limitParam = parseInt(req.query.limit);
  let queryCount;

  User.findById(idToSearch, function(err, userFound) {
    if (err) return console.log(err);
    if (userFound != undefined) {
      // Exercise query with other queries when applicable
      let exerciseQuery = Exercise.find({ user_id: idToSearch });
      if (fromParam) {
        exerciseQuery = exerciseQuery.find({
          date: { $gte: fromParam }
        });
      }
      if (toParam) {
        exerciseQuery = exerciseQuery.find({
          date: { $lte: toParam }
        });
      }
      if (limitParam != undefined) {
        exerciseQuery = exerciseQuery.limit(limitParam);
      }
      exerciseQuery.select({ _id: 0, user_id: 0, __v: 0 });
      exerciseQuery.exec(function(err, exercises) {
        if (err) return console.error(err);
        exercises = exercises.map(exercise =>
          ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          }));
        console.log(exercises)
        res.json({
          _id: userFound._id,
          username: userFound.username,
          count: exercises.length,
          log: exercises
        });
      });
    }
    else {
      res.json({ error: 'User not found' });
    }
  });

});

app.post('/api/users', function(req, res) {
  let postedUsername = req.body.username;
  User.findOne({ username: postedUsername }, function(err, userFound) {
    if (err) return console.log(err);
    if (userFound != undefined) {
      res.json(
        {
          username: userFound.username,
          _id: userFound._id,
        });
    }
    else {
      let NewUser = new User({ username: postedUsername });
      NewUser.save(function(err, data) {
        if (err) return console.error(err);
        res.json({
          username: NewUser.username,
          _id: NewUser._id,
        });
      });
    }
  });
});

app.post('/api/users/:_id/exercises', function(req, res) {
  let postedId = req.params._id;
  let postedDescription = req.body.description;
  let postedDuration = req.body.duration;
  let postedDate = req.body.date;
  if (postedDate == undefined) {
    postedDate = new Date(2021, 11, 26);
  }

  User.findOne({ _id: postedId }, function(err, userFound) {
    if (err) return console.log(err);
    if (userFound == undefined) {
      res.json(
        {
          error: 'User not found',
        });
    }
    else {
      console.log(new Date(postedDate).toDateString());
      let NewExercise = new Exercise(
        {
          user_id: postedId,
          description: postedDescription,
          duration: parseInt(postedDuration),
          date: new Date(postedDate)
        });
      NewExercise.save(function(err, data) {
        if (err) return console.error(err);
        res.json({
          _id: postedId,
          username: userFound.username,
          date: new Date(postedDate).toDateString(),
          duration: parseInt(postedDuration),
          description: postedDescription,
        });
      });
    }
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

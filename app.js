var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const layouts = require("express-ejs-layouts");
const axios = require('axios')
const auth = require('./routes/auth');
const session = require("express-session");
const MongoDBStore = require('connect-mongodb-session')(session);




// *********************************************************** //
//  Loading JSON datasets
// *********************************************************** //
const universities = require('./public/data/world_universities_and_domains.json')

// *********************************************************** //
//  Loading models
// *********************************************************** //

const University = require('./models/University')

// *********************************************************** //
//  Connecting to the database
// *********************************************************** //

const mongoose = require( 'mongoose' );
const mongodb_URI = process.env.mongodb_URI;
//const mongodb_URI = 'mongodb://localhost:27017/cs103a_todo'
//const mongodb_URI = 'mongodb+srv://cs_sj:BrandeisSpr22@cluster0.kgugl.mongodb.net/JoeyZhang?retryWrites=true&w=majority'
//cs152a:yHjjmOXVb9zS1Nn6
//const mongodb_URI='mongodb+srv://cs152a:yHjjmOXVb9zS1Nn6@cluster0.bojm1.mongodb.net/?retryWrites=true&w=majority'


mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
//mongoose.set('useFindAndModify', false); 
//mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {console.log("we are connected!!!")});

// middleware to test is the user is logged in, and if not, send them to the login page
const isLoggedIn = (req,res,next) => {
  if (res.locals.loggedIn) {
    next()
  }
  else res.redirect('/login')
}


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var store = new MongoDBStore({
  uri: mongodb_URI,
  collection: 'mySessions'
});

// Catch errors
store.on('error', function(error) {
  console.log(error);
});

var app = express();

app.use(require('express-session')({
  secret: 'This is a secret 7f89a789789as789f73j2krklfdslu89fdsjklfds',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: true
}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(layouts)
app.use(auth)
app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/developer',
  (req,res,next) =>{
    res.render('developer');
  })

app.get('/uploadDB',
  async (req,res,next) => {
    await University.deleteMany({});
    await University.insertMany(universities);
    const num = await University.find({}).count();
    res.send("data uploaded: "+num)
  }
)

app.get('/bigCourses',
  async (req,res,next) => {
    try{
      const bigCourses =  await Course.find({enrolled:{$gt:150}})
                          .select("subject coursenum name enrolled term")
                          .sort({term:1,enrolled:-1})
                          .limit(3)
                          //.select("subject coursenum name enrolled term")
                          //.sort({term:1,enrolled:-1})
                          //.limit(3)
                          ;
      res.json(bigCourses);
    }catch(e){
      next(e)
    }
  })


app.get('/addUniversity/:id',
  isLoggedIn,
  async (req,res,next) => {
   try {
     const schedItem = 
        new Schedule(
         {
           userid:res.locals.user._id,
           universityId:req.params.id}
         )
     await schedItem.save();
     res.redirect('/universityByCountry')
   }catch(e) {
     next(e)
   }
  })

app.get('/showSchedule',
  isLoggedIn,
  async (req,res,next) => {
    try{
      const universities = 
        await Schedule.find({userId:res.locals.user.id})
          .populate('universityId')
      //res.json(courses);
      res.locals.universities = universities;
      res.render('showmyschedule')
    }catch(e){
      next(e);
    }
  })


app.get('/deleteFromSchedule/:itemId',
  isLoggedIn,
  async (req,res,next) => {
    try {
      const itemId = req.params.itemId;
      await Schedule.deleteOne({_id:itemId});
      res.redirect('/showSchedule');
    } catch(e){
      next(e);
    }
  })

app.get('/universityByCountry',
  (req,res,next) =>{
    res.locals.universities =[]
    //console.log('rendering universityByCountry')
    res.render('universityByCountry')
  })

app.post('/universityByCountry',
  async (req,res,next) => {
    try{
      const country = req.body.country;
      const data = await University.find({country:req.body.country});   
      const selectedUniversity = 
          await Schedule.find({userId:res.locals.user.id});
      res.locals.selectNames = 
          data.map(x => x.universityName);
      res.locals.universities = data;
      res.render('universityByCountry');  
    }catch(e){
      next(e)
    }
  })

app.get('/university',
  (req,res,next) => {
    res.render('university');
  });

app.post('/university',
  async (req,res,next) => {
    const country = req.body.country;
    const response = await axios.get('http://universities.hipolabs.com/search?country=' + country);
    console.dir(response.data.length);
    res.locals.lists = response.data;
    res.render('showUniversity');
  })

const ToDoItem = require('./models/ToDoItem');
const Schedule = require('./models/Schedule');

app.get('/todo', (req,res,next) => res.render('todo'))
  
app.post('/todo',
    isLoggedIn,
    async (req,res,next) => {
      try {
        const desc = req.body.desc;
        const todoObj = {
          userId:res.locals.user._id,
          descr:desc,
          completed:false,
          createdAt: new Date(),
        }
        const todoItem = new ToDoItem(todoObj); // create ORM object for item
        await todoItem.save();  // stores it in the database
        res.redirect('/showTodoList');
  
  
      }catch(err){
        next(err);
      }
    }
  )
  
  app.get('/showTodoList',
          isLoggedIn,
    async (req,res,next) => {
     try {
      const todoitems = await ToDoItem.find({userId:res.locals.user._id});
  
      res.locals.todoitems = todoitems
      res.render('showTodoList')
      //res.json(todoitems);
     }catch(e){
      next(e);
     }
    }
  )
  
app.get('/deleteToDoItem/:itemId',
  isLoggedIn,
  async (req,res,next) => {
  try {
    const itemId = req.params.itemId;
    await ToDoItem.deleteOne({_id:itemId});
    res.redirect('/showToDoList');
  } catch(e){
    next(e);
  }
})

app.get('/toggleToDoItem/:itemId',
    isLoggedIn,
    async (req,res,next) => {
      try {
        const itemId = req.params.itemId;
        const item = await ToDoItem.findOne({_id:itemId});
        item.completed = ! item.completed;
        await item.save();
        res.redirect('/showTodoList');
      } catch(e){
        next(e);
      }
    })

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

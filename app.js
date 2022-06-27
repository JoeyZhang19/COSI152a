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
//const mongodb_URI = 'mongodb://localhost:27017/cs103a_todo'
const mongodb_URI = 'mongodb+srv://cs_sj:BrandeisSpr22@cluster0.kgugl.mongodb.net/JoeyZhang?retryWrites=true&w=majority'

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


app.get('/simpleform',
  isLoggedIn,
  (req,res,next) => {
    res.render('simpleform')
  })

app.post("/simpleform", 
  isLoggedIn,
 (req, res, next) => {
  // res.json(req.body);
  const { username, age, height } = req.body;
    res.locals.username = username;
    res.locals.age = age;
    res.locals.ageInDays = age*365;
    res.locals.heightCM = height*2.54
    res.locals.version='1.1.0';
    res.render('simpleformresult');
  })

app.get('/bmi',
  (req,res,next) =>{
    res.render('bmi');
  })

app.post('/bmi',
  (req,res,next) => {
    const{height,weight} = req.body;
    res.locals.height = height;
    res.locals.weight = weight;
    res.locals.bmi = weight/(height*height)*703;
    res.locals.version='1.1.1';
    res.render('bmiresult');
  })

const family=[
    {name:'Bob',age:13,},
    {name:'Tom',age:20,},
    {name:'Lisa',age:22,},
    ];

app.get('/showFamily',
    (req,res,next) => {
      res.locals.family = family;
      res.render('showFamily');
    })

app.get('/apidemo/:email',
    async (req,res,next) => {
      const email = req.params.email;
      const response = await axios.get('https://www.cs.brandeis.edu/~tim/cs103aSpr22/courses20-21.json')
      console.dir(response.data.length)
      res.locals.courses = response.data.filter((c) => c.instructor[2]==email+"@brandeis.edu")
      res.render('showCourses')
      //res.json(response.data.slice(100,105));
    })

app.get('/dist',
  (req,res,next) =>{
    res.render('3Ddist');
  })
  
app.post('/dist',
  (req,res,next) => {
    const{x,y,z} = req.body;
    res.locals.x = x;
    res.locals.y = y;
    res.locals.z = z;
    res.locals.d = Math.sqrt(x*x+y*y+z*z);
    res.render('3Ddistresult');
  })

app.get('/exam3b',
  (req, res, next) => {
    res.render('exam3b')
  }
)

app.post('/exam3b',
  (req,res,next) => {
    const {url} = req.body;
    res.locals.url = url
    res.render('exam3bShowImage');
  }
)

app.get('/githubInfo/:githubId',
  async (req,res,next) => {
    const id = req.params.githubId;
    const response = await axios.get('https://api.github.com/users/'+id+'/repos')
    console.dir(response.data.length)
    res.locals.repos = response.data
    res.render('showRepos')
    //res.json(response.data.slice(100,105));
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


app.get('/addUniversity/:name',
  isLoggedIn,
  async (req,res,next) => {
   try {
     const schedItem = 
        new Schedule(
         {
           userid:res.locals.user._id,
           universityName:req.params.universityName}
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
          .populate('universityName')
      //res.json(courses);
      res.locals.universities = universities;
      res.render('showmyschedule')
    }catch(e){
      next(e);
    }
  })

// app.get('/deleteFromSchedule/:itemId',
//   isLoggedIn,
//   async (req,res,next) => {
//     try {
//       const itemId = req.params.itemId;
//       await Schedule.deleteOne({_id:itemId});
//       res.redirect('/showSchedule');
//     } catch(e){
//       next(e);
//     }
//   })

app.get('/universityByCountry',
  (req,res,next) =>{
    res.locals.universities =[]
    console.log('rendering universityByCountry')
    res.render('universityByCountry')
  })

app.post('/universityByCountry',
  async (req,res,next) => {
    try{
      const country = req.body.country;
      console.log(country);
      const data = await University.find({country:req.body.country});
      console.log("hello world");
      //.select("subject coursenum name enrolled term")
      //res.json(data);     
      const selectedUniversity = 
          await Schedule.find({userId:res.locals.user.id});
      console.log(selectedUniversity);
      // res.locals.selectNames = 
      //    data.map(x => x.universityName);
      res.locals.universities = data;
      res.render('universityByCountry');  
    }catch(e){
      next(e)
    }
  })


app.get('/meals',
  (req,res,next) => {
    res.render('meals');
  });

app.post('/meals',
  async (req,res,next) => {
    const ingredient = req.body.ingredient;
    const response = await axios.get('https://www.themealdb.com/api/json/v1/1/filter.php?i=' + ingredient);
    console.dir(response.data.length);
    res.locals.meals = response.data.meals;
    res.render('showMeals');
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

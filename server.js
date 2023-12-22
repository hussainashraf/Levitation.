const express = require('express')
const app = express()
const port = 3000
const bodyParser = require('body-parser');
const cors = require('cors'); 
const mongoose = require('./db');
const User = require('./schema/user')
const Blog = require('./schema/Blog')
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');

app.use(mongoSanitize());
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

dotenv.config();

const PORT = process.env.PORT || 3000;

//scret key

const secretKey = process.env.SECRET_KEY;


// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
//register endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({ username, password: hashedPassword });
  await user.save();

  res.status(201).send('User registered successfully');
});


//login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user){
    return res.status(404).json({ message: 'No user found' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.sendStatus(401);

  const token = jwt.sign({ username }, secretKey);
  if(token){
    return res.status(200).json({token});
  }
 
  
});

//get all post endpoint
app.get('/posts', async (req, res) => {
  const blog = await Blog.find();
  res.json(blog);
});

//create post
app.post('/posts', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const author = req.user.username;

  const blog = new Blog({ title, content, author });
  await blog.save();

  res.status(201).send('Post created successfully');
});
//update post
app.put('/posts/:id', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const blogId = req.params.id;
  const author = req.user.username;

  const blog = await Blog.findOne({ _id: blogId,author});
  if (!blog) return res.sendStatus(404);

  blog.title = title;
  blog.content = content;
  await blog.save();

  res.send('Post updated successfully');
});
//delete post
app.delete('/posts/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const author = req.user.username;

  const blog = await Blog.findOneAndDelete({ _id: postId, author });
  if (!blog) return res.sendStatus(404);

  res.send('Post deleted successfully');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${PORT}`)
})
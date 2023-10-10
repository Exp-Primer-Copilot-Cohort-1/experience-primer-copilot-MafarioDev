// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Store all comments in memory
const commentsByPostId = {};

// Route to handle all incoming comments
app.get('/posts/:id/comments', (req, res) => {
  res.status(200).send(commentsByPostId[req.params.id] || []);
});

// Route to handle all incoming comments
app.post('/posts/:id/comments', async (req, res) => {
  // Generate a random ID for each comment
  const commentId = Math.random().toString(36).substring(2);
  // Get the comment from the request body
  const { content } = req.body;
  // Get the post id from the request params
  const { id: postId } = req.params;
  // Get all comments for the post
  const comments = commentsByPostId[postId] || [];
  // Add the new comment to the comments array
  comments.push({ id: commentId, content, status: 'pending' });
  // Update the comments array for the post
  commentsByPostId[postId] = comments;
  // Send the comment to the event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId, status: 'pending' },
  });
  // Send the new comments array as a response
  res.status(201).send(comments);
});

// Route to handle all incoming events
app.post('/events', async (req, res) => {
  // Get the event type and data from the request body
  const { type, data } = req.body;
  // If the event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the id, postId, status and content from the event data
    const { id, postId, status, content } = data;
    // Get all the comments for the post
    const comments = commentsByPostId[postId];
    // Find the comment with the same id
    const comment = comments.find((comment) => comment.id === id);
    // Update the status of the comment
    comment.status = status;
    // Send the comment to the event bus
    await
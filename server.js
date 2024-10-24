const express = require('express');
const app = express();
const path = require('path');

// Serve static files from the 'public' directory at the root path
app.use(express.static('public'));

// Serve the bundled files from 'dist' directory at the '/dist' path
app.use('/dist', express.static('dist'));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

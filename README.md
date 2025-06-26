# [VolleyBoard][github-pages-link]

[Live demo][github-pages-link]

This is a volleyball strategy board web app. Hosted via GitHub Pages.  
It allows users to create and manipulate volleyball formations, including players and arrows, on a virtual court.

## Features

- Create and edit volleyball formations:
  - Add players, balls and arrows to the court
  - Customizable player and arrow properties

- User-friendly interface with drag-and-drop functionality
- Keyboard shortcuts for quick actions
- Responsive design for various screen sizes
- Boards are persisted across page reloads

  ### Future features

  [Todo List](TODO.md)

- Save and load formations
- Share formations via URL
- Improved mobile compatibility
- Login functionality for saving boards to user accounts

## Project Structure

- `index.html`  
  Single HTML file, contains the structure of the page and the toolbar + canvas
- `static/app.js`  
  All the JavaScript code for the app, including interactions with the canvas, event handling and state management.
- `static/styles.css`  
  Your classic stylesheet

No build step required. All files are static and ready for deployment.  
Website is hosted on GitHub Pages

[github-pages-link]: https://cyril-sabourault.github.io/volleyboard

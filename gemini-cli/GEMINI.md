# Project: Volleyboard

## 1. Project Overview

Volleyboard is a static, single-page web application designed as an online whiteboard for planning volleyball composition and strategy. It is optimized for mobile phone usage with full support for touch screen actions.

## 2. Core Features

*   **No Authentication:** The application is publicly accessible with no login required.
*   **State Persistence & Undo/Redo:** The entire state of the board (object positions, colors, etc.) is persisted in `localStorage` to survive a page refresh. Undo and Redo functionality is available.
*   **Vertical Toolbar:** A vertical toolbar on the side of the court contains all available tools.
*   **Tool Modes:** The application has two main modes:
    *   **Select Mode:** The default mode for selecting and moving objects.
    *   **Placement Mode:** Activated when an object creation tool is selected. The active tool is highlighted in the toolbar.
*   **Tools:** The toolbar contains: 'Select', 'Add Player', 'Add Ball', 'Draw Line', 'Clear All', 'Undo', and 'Redo'.
*   **Color Customization:** A color picker button is available in the toolbar. The button displays the currently selected color. Clicking the button opens a palette of color swatches to choose from. The selected color is used for any new shapes or drawings and is persisted.

## 3. Visuals & Canvas

*   **Court:** The canvas is a minimalist but recognizable top-down view of an indoor volleyball court, with all standard lines and the net drawn. The court maintains a proper 1:2 aspect ratio.
*   **Layout:** The application features a vertical toolbar alongside the court, designed to fit within the visible viewport without scrolling.
*   **Ball:** A simple circle shape.
*   **Player:** An oval shape, wider than it is tall, to represent a player's shoulders facing the net.
*   **Lines:** Lines are drawn with a small trapezoid arrowhead to indicate direction. The arrowhead color matches the line color.

## 4. UI/UX and Interaction Details

*   **Zoom Prevention:** Accidental zooming (e.g., via double-tap or pinch) is disabled.
*   **Text Selection:** Text selection is disabled everywhere on the site.
*   **Object Insertion (Placement Mode):**
    *   Clicking 'Add Player' or 'Add Ball' enters placement mode; the next click on the court places the object at that location.
    *   Clicking 'Draw Line' enters a press-and-drag drawing mode:
        *   **Press and hold** on the court to start the line.
        *   **Drag** to define the line's length and angle in real-time.
        *   **Release** to finalize the line.
        *   A simple **click** (or a very short drag) will create a line of a default, minimal length.
    *   The 'Select' tool or clicking the active tool again exits placement mode.
*   **Object Selection (Select Mode):**
    *   Pressing (`mousedown`) on an object selects it, showing handles for manipulation.
    *   Clicking anywhere outside the selected object and its handles deselects it.
*   **Object Manipulation:**
    *   **Movement:** Any object can be moved by a direct click-and-drag action.
    *   **Deletion:** 
        *   A delete handle ('cross' icon) is displayed for selected objects (players, balls) and for hovered or selected lines.
        *   Alternatively, pressing the 'Backspace' or 'Delete' key will remove the currently selected object.
    *   **Rotation:** Selected players and balls display a handle to allow rotation.
    *   **Line Resizing:** Selected lines have circular handles at each endpoint that can be dragged to change the line's position and length.
*   **Improved Interaction:** 
    *   Objects have an invisible, larger "grabbable" area to make them easier to select and drag on touch screens. 
    *   Lines also have an invisible, wider hitbox to make them easier to select.
    *   Handles for lines and objects are sized for easy touch interaction.
*   **Escape to Select Mode:** Pressing the 'Escape' key will always switch the application back to 'Select Mode'.
*   **Intelligent Mode Switching:** When in any placement mode, grabbing an existing object to move it will automatically switch the tool to 'Select Mode' and allow the object to be dragged without creating a new one.
*   **Shift-Click Override:** Holding 'Shift' while clicking anywhere on the court, including on top of an existing object, will always start drawing a new line without selecting or moving the object underneath.
*   **Line Placement via Keyboard:** Pressing the 'Shift' key enters 'Draw Line' placement mode.
*   **Quick Player Add:** Double-clicking (or double-tapping on mobile) on the court instantly adds a new player at that location.

## 5. Technical Stack & Architecture

*   **Type:** Static Single-Page Application (SPA).
*   **Frontend:** The application is built using HTML, CSS, and JavaScript.
*   **Persistence:** Uses the browser's `localStorage` API to save and retrieve the board's state.
*   **Graphics:** The court and objects are rendered using a combination of HTML elements (`<div>`) and SVG for lines, prioritizing ease of manipulation.

## 6. Development

This is a static website. Do not attempt to start a server using `npm start` or any other command. To view the website, open the `index.html` file directly in a web browser.

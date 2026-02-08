I want to create a React application, using react-flow to draw a family genealogical tree. The idea is that the source of truth is a CSV file, with all the information. Each row is a family member, with unique id, name, birth place, birth day, death day, father, mother, married to, avatar url, and extended info. With this information I want to distribute the nodes in this way:
- Simblings (brothers, sisters) should be in the same horizontal line
- Marriages must be close together and a line should join them.
- For kids, a line should go from the marrieage line to the kid
Each node should should the basic information like name, birth day, death day. Add some iconography to make it beatiful.
We should have a search box to be able to find some specific person with keyboard navigation and live highlight of matches.
1. Project scaffold
   - Create Vite + React app.
   - Install deps: reactflow, papaparse, react-icons.
2. CSV source of truth
   - Add public/people.csv with headers:
     id,name,birth_day,death_day,birth_place,father,mother,married_to,avatar_url,info
   - Parse with papaparse, normalize IDs, handle missing parents or spouse.
3. Data model
   - Build peopleById map.
   - Build childrenByParents map keyed by (fatherId, motherId) or fallback to known parent.
   - Build marriageByPerson map and unique “couple” entities.
   - Create “solo couple” nodes for single parent.
   - Detect inconsistent relationships and surface warnings.
4. Layout (top-down)
   - Compute generation levels by BFS from roots (no parents).
   - Assign y = generation * verticalGap (older → top).
   - Siblings share same y.
   - Couples adjacent on same row; marriage node centered between partners.
   - Children edges connect from marriage node down to child.
5. React Flow nodes/edges
   - Custom PersonNode with:
     - reserved image slot (fixed box).
     - name, birth/death, birth place.
     - iconography via react-icons.
     - warning indicator and info button for biographies.
   - MarriageNode: subtle heart connector.
   - Edges:
     - partner → marriage node.
     - marriage → child.
6. Search UI
   - Search box with case-insensitive name match.
   - Keyboard navigation with Enter selection.
   - Highlight matches while typing; highlight selected node and use fitView / center on it.
7. Settings + data controls
   - Modal with locale, theme, and show warnings toggle.
   - Save settings to localStorage.
   - Load CSV button for new datasets.
8. Info modal
   - Show extended biography, avatar, and birth/death summary.
9. Styling
   - Clean card UI with shadow, rounded corners, consistent spacing.
   - Color accents for alive/deceased and highlight states.
10. Extras
   - Print control and improved print stylesheet.
   - Keyboard shortcuts: `/` focuses search, `ESC` clears selection.
   - Favicon in header and browser tab.
11. Timeline (new)
   - Button next to Load CSV opens timeline modal.
   - Select start/end dates and animate year by year.
   - Fade nodes outside the current year range.
   - Stop button to halt animation.
12. Run + verify
   - Start dev server and validate layout, search, edges, settings, and timeline.

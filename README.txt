================================================================================
MindScapeS Frontier Talk Series 2026 — Website Administration Guide
================================================================================

This website is built with plain HTML and CSS. There are no build tools, no
databases, no package managers, and no special software required. You can edit
any file using Notepad, TextEdit, VS Code, or any plain text editor, and view
the result immediately by double-clicking the HTML file in your browser.

--------------------------------------------------------------------------------
TABLE OF CONTENTS
--------------------------------------------------------------------------------
1. File Structure Overview
2. How to Change Placeholders (Registration, Emails, Mailing List)
3. How to Add or Edit a Session in the Schedule
4. How to Update the "Next Talk" on the Home Page
5. How to Add a Speaker
6. How to Update the Archive after a Talk
7. How to Add Items to the Reading List
8. How to Change or Replace Images
9. How to Change Colors and Fonts
10. How to Publish and Host the Website


================================================================================
1. FILE STRUCTURE OVERVIEW
================================================================================
MindScapeS/
│
├── index.html            Home page (overview, next talk, format, next 3 sessions)
├── schedule.html         Full 2026 programme, times in IST, session formats
├── speakers.html         Speaker profiles (3-column grid) & commentators list
├── register.html         Registration information, external form link, conduct
├── archive.html          Past talks, recordings, presentation slides, policy
├── reading-list.html     Suggested preparatory readings grouped by speaker
├── about.html            Purpose, student-first ethos, committee members
├── contact.html          Contact email, committee list, talk proposals
│
├── style.css             The single shared stylesheet (under 250 lines)
├── menu.js               Small script for mobile menu & talk card abstracts
├── favicon.svg           Simple text-based icon
├── favicon.ico           Standard icon fallback
├── README.txt            This administration guide
│
├── abstracts/            Folder containing plain text (.txt) abstracts
│   ├── 2026-10-30-kibbe.txt
│   ├── 2026-11-06-schellenberg.txt
│   ├── 2026-11-13-gibson.txt
│   ├── 2026-11-20-prasada.txt
│   ├── 2026-11-27-jha.txt
│   ├── 2026-12-04-morning-spelke.txt
│   ├── 2026-12-04-evening-yousif.txt
│   ├── 2026-12-11-dillon.txt
│   └── template-abstract.txt
│
└── images/
    ├── home-hero.jpg     Main photograph on the home page (1200x600 px)
    ├── about-group.jpg   Colloquium photograph on the about page (1000x625 px)
    │
    ├── archive/
    │   └── 2026-10-30.jpg  Optional thumbnail for past talk (16:9 ratio)
    │
    └── speakers/         Speaker portraits (4:5 ratio, 400x500 px)
        ├── melissa-kibbe.jpg
        ├── susanna-schellenberg.jpg
        ├── edward-gibson.jpg
        ├── sandeep-prasada.jpg
        ├── v-n-jha.jpg
        ├── sami-yousif.jpg
        ├── liz-spelke.jpg
        └── moira-dillon.jpg


================================================================================
2. HOW TO CHANGE PLACEHOLDERS
================================================================================
Before publishing, open the files below and replace the following placeholder
texts with your actual links and details:

A. REGISTRATION FORM URL:
   - File: register.html and contact.html
   - Search for: REGISTRATION_FORM_URL
   - Replace with: Your active Google Form, Tally.so, or Formspree URL.
     Example: https://forms.gle/xyz123456789

B. MAILING LIST URL:
   - Configured: https://groups.google.com/g/mindscapesdu/
   - Active across index.html and contact.html. Visitors can join directly.

C. CONTACT EMAIL:
   - Files: Repeated across the footer of every HTML page, plus contact.html
   - Search for: mindscapesdu@gmail.com
   - Replace with: Your actual departmental or series email address.

D. INSTITUTION & BIO PLACEHOLDERS:
   - Files: schedule.html and speakers.html
   - Search for: [Institution Placeholder: ...] and [Bio placeholder: ...]
   - Replace with: Confirmed university departments and 2–3 line biographies.


================================================================================
3. HOW TO ADD OR EDIT A SESSION IN THE SCHEDULE
================================================================================
Open "schedule.html" in your text editor. Every session is enclosed in a clearly
labeled block.

To edit an existing session:
Find the session block (e.g., "SESSION: Oct 30 – START"), and change the speaker
name, time, affiliation, talk title, or commentators directly. If a commentator
is not yet known, keep the <span class="tba">To be announced</span> markup so
it renders in a muted grey tone.

To add an abstract text file for a talk:
1. Go into the `abstracts/` folder.
2. Copy `template-abstract.txt` or create a new file named e.g. `2026-10-30-kibbe.txt`.
3. Open the file in Notepad, paste the abstract text, and save.
4. In `schedule.html`, set the file path in `data-abstract-file="..."` and `href="..."`.

To add a new session row to the schedule table in `schedule.html`:
Copy the template block below, paste it where you want it to appear in date order,
and fill in the details:

<!-- ===== SESSION ROW: Date – START ===== -->
<!-- Copy this block to add a new session row; delete the block to remove it. -->
<tr>
  <td class="col-time">
    <span class="date-str">Fri, Jan 15, 2027</span>
    <span class="time-str">6:30 PM IST (UTC+5:30)</span>
  </td>
  <td class="col-speaker">
    <span class="speaker-str">Prof. Full Name</span>
    <span class="affil-str">Department Name, University Name</span>
  </td>
  <td class="col-title">
    <em>The Conceptual Format of Thought</em>
  </td>
  <td class="col-format">
    <ol class="format-list">
      <li>Talk</li>
      <li>Student-First Q&amp;A</li>
      <li>Commentator 1: Prof. First Commentator</li>
      <li>Commentator 2: <span class="tba">TBA</span></li>
      <li>Open Q&amp;A</li>
    </ol>
  </td>
  <td class="col-actions">
    <div class="action-stack">
      <button type="button" class="btn-table btn-view-abs" data-abstract-file="abstracts/your-file-name.txt" data-talk-title="The Conceptual Format of Thought" data-talk-speaker="Prof. Full Name" data-talk-date="Jan 15, 2027 • 6:30 PM IST" data-session-target="Jan 15 - Name">View Abstract</button>
      <button type="button" class="btn-table btn-reg-talk" data-session-target="Jan 15 - Name">Register</button>
    </div>
  </td>
</tr>
<!-- ===== SESSION ROW: Date – END ===== -->

To remove a session row:
Select everything from "<!-- ===== SESSION ROW: ... – START ===== -->" through
"<!-- ===== SESSION ROW: ... – END ===== -->" and press Delete.


================================================================================
4. HOW TO UPDATE THE "NEXT TALK" ON THE HOME PAGE
================================================================================
Open "index.html" in your text editor. Near the top of the main section, find:
<!-- ===== NEXT TALK BLOCK – START ===== -->
...
<!-- ===== NEXT TALK BLOCK – END ===== -->

When a talk has finished, update this card with the next upcoming speaker, date,
IST time, and title. Also update the 3-talk compact list right below it.


================================================================================
5. HOW TO ADD A SPEAKER
================================================================================
Open "speakers.html". Inside the `<div class="speaker-grid">`, copy and paste
one of the speaker cards:

<!-- ===== SPEAKER: Name – START ===== -->
<!-- Copy this block to add a new item; delete the block to remove it. -->
<article class="speaker-card">
  <img class="speaker-photo" src="images/speakers/firstname-lastname.jpg" alt="Portrait of Prof. Firstname Lastname" width="400" height="500" loading="lazy">
  <h2 class="speaker-name">Prof. Firstname Lastname</h2>
  <div class="speaker-institution">Department of Philosophy, University Name</div>
  <div class="speaker-date">Speaking: Month Day, 2026</div>
  <p class="speaker-bio">Two to three sentences describing their research focus, notable publications, or primary area of investigation.</p>
  <div class="speaker-link"><a href="https://example.edu" target="_blank" rel="noopener noreferrer">Speaker website</a></div>
</article>
<!-- ===== SPEAKER: Name – END ===== -->

Remember to add the speaker's photo in 4:5 ratio to `images/speakers/firstname-lastname.jpg`.


================================================================================
6. HOW TO UPDATE THE ARCHIVE AFTER A TALK
================================================================================
Open "archive.html". When a session concludes and you have permission to share
the recording and slides, uncomment and update the archive template block:

<!-- ===== ARCHIVE ITEM: Oct 30 – START ===== -->
<article class="archive-item">
  <div class="session-meta">
    <span class="session-date">October 30, 2026</span> &bull; 6:30 PM IST
  </div>
  <h2>Prof. Melissa Kibbe</h2>
  <div class="session-affiliation">Boston University</div>
  <div class="session-title">Talk Title: [Confirmed Title]</div>
  <p>[Short summary of the talk: 3–4 sentences describing the primary thesis, experimental evidence discussed, and main points raised during the student Q&amp;A and commentator remarks.]</p>
  <div class="archive-links">
    <a href="https://youtube.com/watch?v=your-video-id" target="_blank" rel="noopener noreferrer">Watch Recording (Video)</a>
    <a href="https://example.edu/slides.pdf" target="_blank" rel="noopener noreferrer">Download Slides (PDF)</a>
  </div>
  <p class="subtext">Recorded with the consent of all participants.</p>
</article>
<!-- ===== ARCHIVE ITEM: Oct 30 – END ===== -->


================================================================================
7. HOW TO ADD ITEMS TO THE READING LIST
================================================================================
Open "reading-list.html". Copy the block below to add readings for a new speaker:

<!-- ===== READING GROUP: Speaker Name – START ===== -->
<section class="reading-group">
  <h2>Prof. Speaker Name (Month Day, 2026)</h2>

  <div class="reading-item">
    <div class="citation">
      Author, A., &amp; Author, B. (Year). "Article Title". <em>Journal Name</em>, 12(3), 45–67.
      [<a href="https://doi.org/..." target="_blank" rel="noopener noreferrer">Link / DOI</a>]
    </div>
    <div class="note">Why it is relevant: One-line explanation of why this paper prepares participants for the talk.</div>
  </div>
</section>
<!-- ===== READING GROUP: Speaker Name – END ===== -->


================================================================================
8. HOW TO CHANGE OR REPLACE IMAGES
================================================================================
All images live inside the `images/` directory:

1. Speaker portraits:
   - Save your image with the file name `images/speakers/firstname-lastname.jpg`.
   - Crop to a portrait 4:5 aspect ratio (e.g. 400 pixels wide by 500 pixels tall).
   - Compress the image to keep file size under 300 KB (free tools like squoosh.app or tinypng.com).
   - Replacing the file with the same name updates the site immediately.

2. Home hero photograph:
   - Replace `images/home-hero.jpg` with a calm photo of your seminar room, library, or books by a window.
   - Recommended size: 1200 x 600 pixels (or 1400 x 700 pixels). Under 300 KB.

3. About photograph:
   - Replace `images/about-group.jpg` with a photo of the discussion room or organizing group.
   - Recommended size: 1000 x 625 pixels. Under 300 KB.

Attribution notice: If you use photographs from Unsplash or Wikimedia Commons,
note the photographer credit in this README or in the `<figcaption>` text under
the image.


================================================================================
9. HOW TO CHANGE COLORS AND FONTS
================================================================================
Open "style.css" in your text editor. At the very top (lines 1 to 20), you will
find the CSS Variables:

:root {
  --bg-color: #faf8f4;          /* Warm off-white background */
  --text-color: #1a1917;        /* Near-black readable text */
  --accent-color: #1c3547;      /* Deep academic ink blue */
  --border-color: #dfdad2;      /* Thin rule separator color */
  --card-bg: #f4f0e8;           /* Light tinted box background */
  --font-serif: Georgia, serif; /* Primary font for headings and text */
}

Change any hex code or font name here, and the entire website updates consistently.


================================================================================
10. HOW TO PUBLISH AND HOST THE WEBSITE
================================================================================
This site is 100% static. You can host it anywhere:

Option A: GitHub Pages (Free)
1. Create a repository on GitHub (e.g. "mindscapes-2026").
2. Upload all files from this folder directly into the repository root.
3. In GitHub, go to Settings > Pages, select "Deploy from a branch" > "main" > "/ (root)", and save.
4. Your site is live within 60 seconds at https://username.github.io/repository-name.

Option B: Netlify (Free drag-and-drop)
1. Go to https://app.netlify.com/drop.
2. Drag and drop this entire "MindScapeS" folder onto the browser window.
3. Your site goes live instantly with an automatic SSL certificate.

Option C: Traditional University or Department Web Hosting (cPanel / SFTP)
1. Connect to your university web server using FileZilla, Cyberduck, or your host's cPanel File Manager.
2. Upload all files into your `public_html` or designated series folder.
3. Done.

================================================================================
11. HOW REGISTRATION POPUPS, SUPABASE & CSV WORK
================================================================================
The registration system works seamlessly both offline and online:

A. Local CSV Storage:
   - All submissions are stored in: `CSV/registrations.csv`
   - Fields: id, timestamp, name, email, affiliation, academic_status, sessions, remarks
   - When running `python server.py`, submitting or editing any registration
     automatically syncs and updates `CSV/registrations.csv`.
   - If a participant submits again using the same email or clicks "Edit Registration",
     their existing record is updated in place, preventing duplicates.

B. Supabase Database Sync:
   - Your Supabase Project URL: https://aicypxqetxjhofluwdwf.supabase.co
   - Your Anon Public Key: Configured in `menu.js`
   - To activate the database:
     1. Open your Supabase Project Dashboard -> SQL Editor -> New Query.
     2. Copy all code from `supabase_schema.sql` in this folder, paste it into the editor, and click "Run".
     3. Once created, registrations and edits will automatically sync to your Supabase `registrations` table!

C. Google Forms & Google Sheets Auto-Sync:
   - Form Link: https://forms.gle/bE62CDwjEAXxFpKB6
   - Every registration submitted through the website is automatically and silently
     sent to your Google Form (`formResponse`), populating your linked Google Sheet live.
   - Field mappings:
     * Full Name -> entry.1928414796
     * Email ID -> entry.995403077
     * Affiliation -> entry.722565591
     * Academic Status -> entry.1906996205
     * Sessions -> entry.970231916
     * Remarks -> entry.189452490

D. Offline / In-Browser Resilience:
   - Registrations are also cached in the visitor's browser (localStorage).
   - After submitting, visitors see a confirmation card with an "Edit Registration"
     button so they can revise their entries directly on the page.

================================================================================
End of Administration Guide
================================================================================

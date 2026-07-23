/**
 * Starting templates for the writing pad. Content is Tiptap-compatible HTML
 * using only nodes our toolbar supports (headings, paragraphs, lists) so
 * every template exports cleanly to PDF/DOCX/MD/HTML/TXT.
 */

export interface PadTemplate {
  id: string;
  name: string;
  description: string;
  html: string;
}

export const PAD_TEMPLATES: PadTemplate[] = [
  {
    id: "resume",
    name: "Resume",
    description: "Clean single-page resume",
    html: `
<h1>Your Name</h1>
<p>City, State · +91 00000 00000 · you@email.com</p>
<h2>Summary</h2>
<p>One or two sentences about who you are and what you're looking for.</p>
<h2>Experience</h2>
<h3>Job Title — Company</h3>
<p><em>Month Year – Present</em></p>
<ul><li>Achievement with a number that proves impact.</li><li>Second achievement.</li></ul>
<h2>Education</h2>
<p><strong>Degree</strong>, Institution — Year</p>
<h2>Skills</h2>
<ul><li>Skill one</li><li>Skill two</li><li>Skill three</li></ul>`,
  },
  {
    id: "cover-letter",
    name: "Cover Letter",
    description: "Formal job application letter",
    html: `
<p>Your Name<br>Your Address<br>City – PIN</p>
<p>Date</p>
<p>The Hiring Manager<br>Company Name<br>Company Address</p>
<p><strong>Subject: Application for the position of [Role]</strong></p>
<p>Dear Sir/Madam,</p>
<p>Opening paragraph — the role you're applying for and where you saw it.</p>
<p>Middle paragraph — why you're a strong fit; one concrete achievement.</p>
<p>Closing paragraph — thank them and state your availability for an interview.</p>
<p>Yours sincerely,<br>Your Name</p>`,
  },
  {
    id: "formal-letter",
    name: "Formal Letter / Application",
    description: "Leave application, requests, official letters",
    html: `
<p>To,<br>The [Designation]<br>[Organization Name]<br>[Address]</p>
<p>Date: </p>
<p><strong>Subject: </strong></p>
<p>Respected Sir/Madam,</p>
<p>State your request clearly in the first paragraph.</p>
<p>Add supporting details or dates in the second paragraph.</p>
<p>Thanking you,</p>
<p>Yours faithfully,<br>Your Name<br>[Roll No. / Employee ID]</p>`,
  },
  {
    id: "report",
    name: "Report",
    description: "Structured report with sections",
    html: `
<h1>Report Title</h1>
<p><em>Author · Date</em></p>
<h2>Summary</h2>
<p>Three-sentence overview of what this report covers and concludes.</p>
<h2>Background</h2>
<p>Context the reader needs.</p>
<h2>Findings</h2>
<ul><li>Finding one</li><li>Finding two</li></ul>
<h2>Recommendations</h2>
<ol><li>First recommendation</li><li>Second recommendation</li></ol>`,
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    description: "Agenda, decisions, action items",
    html: `
<h1>Meeting Notes — [Topic]</h1>
<p><em>Date · Attendees</em></p>
<h2>Agenda</h2>
<ul><li>Item one</li><li>Item two</li></ul>
<h2>Decisions</h2>
<ul><li>Decision made and why</li></ul>
<h2>Action Items</h2>
<ol><li><strong>Owner</strong> — task, due date</li></ol>`,
  },
  {
    id: "assignment",
    name: "Assignment",
    description: "Student assignment front page + body",
    html: `
<h1>Assignment Title</h1>
<p><strong>Name:</strong> · <strong>Roll No:</strong> · <strong>Class:</strong> · <strong>Subject:</strong></p>
<h2>Question</h2>
<p>Write the question here.</p>
<h2>Answer</h2>
<p>Start your answer here.</p>`,
  },
];

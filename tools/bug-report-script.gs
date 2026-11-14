/**
 * Underdog bug reports → "Reported bugs" tab of the Underdog Google Doc.
 *
 * Setup (once):
 *  1. Open the Underdog doc → Extensions → Apps Script. Delete the sample code, paste this file, save.
 *  2. Deploy → New deployment → gear icon → "Web app".
 *     Execute as: Me.   Who has access: Anyone.   → Deploy → allow access when Google asks.
 *  3. Copy the Web app URL (https://script.google.com/macros/s/…/exec) and send it to Claude
 *     (it goes in tools/bug-report-url.txt in the app project).
 * Updating the code later: Deploy → Manage deployments → pencil icon → Version: "New version"
 * → Deploy. That keeps the same URL.
 */
const DOC_ID = '1Jp7BAglrJHX1XS7xHtp6_roxnE7AO0Ayq_CuN1O4qN8';
const TAB_ID = 't.iviy3t3fjeir'; // "Reported bugs"

function clip(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const r = JSON.parse(e.postData.contents || '{}');
    if (!r.text || String(r.text).trim().length < 2) return ContentService.createTextOutput('empty');
    const body = DocumentApp.openById(DOC_ID).getTab(TAB_ID).asDocumentTab().getBody();
    const when = Utilities.formatDate(new Date(r.at || Date.now()), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    // Styled with plain text formatting (bold, size, color): setHeading() fails on paragraphs
    // added to a document tab, so headings aren't used here.
    const head = body.appendParagraph(when + ' · ' + clip(r.name || 'Someone', 40));
    head.editAsText().setBold(true).setItalic(false).setFontSize(12).setForegroundColor('#5B2A9E');
    const text = body.appendParagraph(clip(r.text, 1000));
    text.editAsText().setBold(false).setItalic(false).setFontSize(11).setForegroundColor('#000000');
    const where = body.appendParagraph('Where: ' + clip(r.context, 300) + ' · Device: ' + clip(r.device, 200));
    where.editAsText().setBold(false).setItalic(true).setFontSize(9).setForegroundColor('#777777');
    body.appendParagraph('');
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

/** Run this once from the editor (▶ Run) to check it works: it adds a test entry. */
function testReport() {
  doPost({ postData: { contents: JSON.stringify({ text: 'Test report from the Apps Script editor', name: 'Setup test', context: 'editor', device: 'Apps Script', at: new Date().toISOString() }) } });
}

import { Router, Request, Response } from 'express';
import puppeteer from 'puppeteer';
import { AssignmentModel } from '../models/Assignment';
import type { GeneratedPaper } from '@veda-ai/shared';

const router = Router();

function diffColor(d: string): string {
  if (d === 'easy') return '#16a34a';
  if (d === 'hard') return '#dc2626';
  return '#d97706';
}

function buildPaperHTML(paper: GeneratedPaper): string {
  const formattedDate = new Date(paper.dueDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const sectionsHTML = paper.sections
    .map(
      (section) => `
      <div class="section">
        <div class="section-header">
          <span class="sec-label">${section.label}</span>
          <span class="sec-title">${section.title}</span>
          <span class="sec-marks">[${section.totalMarks} Marks]</span>
        </div>
        <p class="sec-instruction"><em>${section.instruction}</em></p>
        <ol class="q-list">
          ${section.questions
            .map(
              (q, idx) => `
            <li class="question">
              <div class="q-row">
                <span class="q-num">${idx + 1}.</span>
                <span class="q-text">${q.text}</span>
                <span class="q-marks">[${q.marks}M]</span>
              </div>
              ${
                q.options && q.options.length > 0
                  ? `<ul class="options">${q.options
                      .map((o) => `<li>${o}</li>`)
                      .join('')}</ul>`
                  : ''
              }
              ${
                q.type === 'true_false' && !q.options
                  ? `<div class="tf-row"><span class="tf-opt">○ True</span><span class="tf-opt">○ False</span></div>`
                  : ''
              }
              ${
                q.type === 'short_answer' || q.type === 'fill_in_the_blank'
                  ? `<div class="answer-line"></div>`
                  : ''
              }
              ${
                q.type === 'long_answer' || q.type === 'essay'
                  ? `<div class="answer-lines"><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div></div>`
                  : ''
              }
              <span class="diff-badge" style="color:${diffColor(q.difficulty)};border-color:${diffColor(q.difficulty)}">
                ${q.difficulty.toUpperCase()}
              </span>
            </li>`
            )
            .join('')}
        </ol>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Times New Roman',serif;font-size:11.5pt;color:#111;padding:28px 36px;line-height:1.5}
  .header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}
  .school{font-size:17pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
  .paper-title{font-size:13pt;margin:4px 0}
  .meta{display:flex;justify-content:space-between;font-size:10pt;margin-top:6px;padding-top:4px;border-top:1px solid #ccc}
  .student-info{border:1px solid #bbb;padding:8px 14px;margin-bottom:14px;display:flex;gap:36px}
  .info-field{font-size:10pt}
  .info-field span{display:inline-block;min-width:130px;border-bottom:1px solid #777;padding-bottom:1px}
  .instructions{margin-bottom:14px;padding:6px 12px;border-left:3px solid #333;background:#f8f8f8}
  .instructions h4{font-size:10pt;margin-bottom:3px}
  .instructions li{font-size:9.5pt;margin-left:16px;line-height:1.7}
  .section{margin-bottom:20px}
  .section-header{display:flex;align-items:baseline;gap:8px;background:#eee;padding:5px 10px;border-left:4px solid #333;margin-bottom:5px}
  .sec-label{font-weight:bold;font-size:12pt}
  .sec-title{flex:1;font-size:10pt}
  .sec-marks{font-size:10pt;font-weight:bold}
  .sec-instruction{font-size:9pt;color:#555;margin-bottom:8px;padding-left:10px;font-style:italic}
  .q-list{list-style:none}
  .question{margin-bottom:12px;padding-left:6px}
  .q-row{display:flex;gap:6px;align-items:flex-start}
  .q-num{font-weight:bold;min-width:18px}
  .q-text{flex:1;line-height:1.55}
  .q-marks{font-size:9.5pt;font-weight:bold;white-space:nowrap}
  .options{margin:5px 0 3px 22px;list-style:none}
  .options li{font-size:10pt;line-height:1.7;margin-bottom:1px}
  .tf-row{margin:5px 0 3px 22px;display:flex;gap:24px;font-size:10pt}
  .answer-line{border-bottom:1px dashed #aaa;height:22px;width:100%;margin:4px 0 0 22px}
  .answer-lines{margin:4px 0 0 0}
  .diff-badge{font-size:7pt;border:1px solid;padding:1px 5px;border-radius:7px;margin-left:22px;display:inline-block;margin-top:3px}
  .footer{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:9pt;color:#888}
</style>
</head>
<body>
  <div class="header">
    <div class="school">VedaAI School</div>
    <div class="paper-title">${paper.title}</div>
    <div class="paper-title" style="font-size:11pt">Subject: ${paper.subject} &nbsp;|&nbsp; Class: ${paper.grade}</div>
    <div class="meta">
      <span>Max. Marks: ${paper.totalMarks}</span>
      <span>Time Allowed: ${paper.duration} Minutes</span>
      <span>Date: ${formattedDate}</span>
    </div>
  </div>

  <div class="student-info">
    <div class="info-field">Name: <span>&nbsp;</span></div>
    <div class="info-field">Roll No: <span>&nbsp;</span></div>
    <div class="info-field">Section: <span>&nbsp;</span></div>
  </div>

  <div class="instructions">
    <h4>General Instructions:</h4>
    <ul>${paper.generalInstructions.map((i, n) => `<li>${n + 1}. ${i}</li>`).join('')}</ul>
  </div>

  ${sectionsHTML}

  <div class="footer">— End of Question Paper — &nbsp;|&nbsp; Generated by VedaAI</div>
</body>
</html>`;
}

router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await AssignmentModel.findById(id).lean();

    if (!assignment || !assignment.paper) {
      return res.status(404).json({
        success: false,
        error: 'Paper not found or not yet generated',
      });
    }

    const html = buildPaperHTML(assignment.paper as GeneratedPaper);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
      printBackground: true,
    });

    await browser.close();

    const filename = `${assignment.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_paper.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    return res.send(Buffer.from(pdf));
  } catch (err) {
    console.error('PDF generation error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to generate PDF' });
  }
});

export default router;

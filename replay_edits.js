const fs = require('fs');

const logPath = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\4840d19b-52d2-411f-963f-7a34ed9889ba\\.system_generated\\logs\\transcript.jsonl';
const baseFilePath = 'c:\\Users\\Usuario\\Desktop\\6to SEMESTRE\\economica\\cafeteria\\src\\app\\dashboard\\admin\\page.js';

let fileContent = fs.readFileSync(baseFilePath, 'utf8');
const logContent = fs.readFileSync(logPath, 'utf8');

const stepStrings = [];
let currentIndex = 0;

while (currentIndex < logContent.length) {
  const nextMatch = logContent.indexOf('{"step_index":', currentIndex + 1);
  if (nextMatch === -1) {
    stepStrings.push(logContent.substring(currentIndex));
    break;
  } else {
    stepStrings.push(logContent.substring(currentIndex, nextMatch));
    currentIndex = nextMatch;
  }
}

function parseJs(str) {
  // Replace raw control characters (newline, carriage return, and tabs) with escaped versions
  const sanitized = str
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return JSON.parse(sanitized);
}

const editSteps = [86, 88, 95, 107, 211, 237, 274, 313, 321];

for (const stepNum of editSteps) {
  let found = false;
  for (const stepStr of stepStrings) {
    if (!stepStr.trim()) continue;
    
    const isTargetStep = stepStr.includes(`"step_index":${stepNum},`) || stepStr.includes(`"step_index":${stepNum}}`);
    if (!isTargetStep) continue;

    try {
      const step = JSON.parse(stepStr.trim());
      if (step.step_index === stepNum) {
        found = true;
        console.log(`Replaying Step ${stepNum}...`);
        if (step.tool_calls) {
          for (const call of step.tool_calls) {
            const args = typeof call.args === 'string' ? parseJs(call.args) : call.args;
            if (call.name === 'replace_file_content') {
              const target = args.TargetContent;
              const replacement = args.ReplacementContent;
              
              if (!fileContent.includes(target)) {
                console.error(`ERROR in Step ${stepNum}: Target content not found in file content!`);
                process.exit(1);
              }
              fileContent = fileContent.replace(target, replacement);
            } else if (call.name === 'multi_replace_file_content') {
              const chunks = typeof args.ReplacementChunks === 'string' 
                ? parseJs(args.ReplacementChunks) 
                : args.ReplacementChunks;
              console.log(`Applying ${chunks.length} chunks...`);
              for (let c = 0; c < chunks.length; c++) {
                const chunk = chunks[c];
                const target = chunk.TargetContent;
                const replacement = chunk.ReplacementContent;
                if (!fileContent.includes(target)) {
                  console.error(`ERROR in Step ${stepNum} Chunk ${c}: Target content not found!`);
                  process.exit(1);
                }
                fileContent = fileContent.replace(target, replacement);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error parsing or replaying Step ${stepNum}:`, err);
      process.exit(1);
    }
  }
  if (!found) {
    console.error(`WARNING: Step ${stepNum} not found in log!`);
  }
}

fs.writeFileSync(baseFilePath, fileContent, 'utf8');
console.log('Replay finished successfully! src/app/dashboard/admin/page.js is now fully restored.');

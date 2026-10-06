const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'anatomy-70.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('TOTAL QUESTIONS = ' + data.length);
const ids = new Set(data.map(q => q.importId));
console.log('UNIQUE IMPORT IDS = ' + ids.size);
let optionsCount = 0;
let exactly4OptionsCount = 0;
let exactly1CorrectCount = 0;

const topicCounts = {
    'anatomy-general-anatomy': 0,
    'anatomy-lower-limb': 0,
    'anatomy-thorax': 0,
    'anatomy-abdomen': 0,
    'anatomy-pelvis-and-perineum': 0,
    'anatomy-head-and-neck': 0,
    'anatomy-neuroanatomy': 0,
    'anatomy-embryology': 0,
    'anatomy-histology': 0,
    'anatomy-genetics-developmental-anatomy': 0,
    'anatomy-radiological-anatomy': 0,
    'anatomy-surface-anatomy': 0,
    'anatomy-applied-anatomy': 0,
    'anatomy-upper-limb': 0
};

for (const q of data) {
    optionsCount += q.options.length;
    if (q.options.length === 4) exactly4OptionsCount++;
    const correctCount = q.options.filter(o => o.isCorrect).length;
    if (correctCount === 1) exactly1CorrectCount++;
    
    if (topicCounts[q.topicSlug] !== undefined) {
        topicCounts[q.topicSlug]++;
    }
}

console.log('TOTAL OPTIONS = ' + optionsCount);
console.log('QUESTIONS WITH EXACTLY 4 OPTIONS = ' + exactly4OptionsCount);
console.log('QUESTIONS WITH EXACTLY 1 CORRECT ANSWER = ' + exactly1CorrectCount);
console.log('');
for (const [topic, count] of Object.entries(topicCounts)) {
    console.log(`${topic} = ${count}`);
}

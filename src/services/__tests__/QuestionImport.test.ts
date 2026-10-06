import { validateQuestionsData, ImportQuestion } from '../../../scripts/import-questions';

describe('Question Import Validation', () => {
  const subjectMap = new Map([['anatomy', 'sub-1']]);
  const topicMap = new Map([['anatomy-general-anatomy', { id: 'top-1', subject_id: 'sub-1' }]]);
  const existingImportIds = new Map([['Q-EXISTS', 1]]);

  const createValidQuestion = (): ImportQuestion => ({
    importId: 'Q-NEW',
    exam: 'NEET-PG',
    subjectSlug: 'anatomy',
    topicSlug: 'anatomy-general-anatomy',
    stem: 'Valid stem',
    options: [
      { text: 'A', isCorrect: true },
      { text: 'B', isCorrect: false }
    ],
    provenance: 'ORIGINAL'
  });

  it('validates a correct question', () => {
    const q = createValidQuestion();
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.valid).toBe(1);
    expect(result.invalid).toBe(0);
    expect(result.report).toHaveLength(0);
  });

  it('rejects missing importId', () => {
    const q = createValidQuestion();
    q.importId = '';
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Missing importId');
  });

  it('rejects blank stem', () => {
    const q = createValidQuestion();
    q.stem = '   ';
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Blank stem');
  });

  it('rejects fewer than 2 options', () => {
    const q = createValidQuestion();
    q.options = [{ text: 'A', isCorrect: true }];
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Must have at least 2 options');
  });

  it('rejects zero correct options', () => {
    const q = createValidQuestion();
    q.options = [
      { text: 'A', isCorrect: false },
      { text: 'B', isCorrect: false }
    ];
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Must have exactly one correct option. Found 0.');
  });

  it('rejects multiple correct options', () => {
    const q = createValidQuestion();
    q.options = [
      { text: 'A', isCorrect: true },
      { text: 'B', isCorrect: true }
    ];
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Must have exactly one correct option. Found 2.');
  });

  it('rejects invalid subject', () => {
    const q = createValidQuestion();
    q.subjectSlug = 'invalid-subject';
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Invalid subject slug: invalid-subject');
  });

  it('rejects invalid topic', () => {
    const q = createValidQuestion();
    q.topicSlug = 'invalid-topic';
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Invalid topic slug: invalid-topic');
  });

  it('rejects topic belonging to wrong subject', () => {
    const q = createValidQuestion();
    q.subjectSlug = 'surgery'; // Does not match topic's subject_id
    subjectMap.set('surgery', 'sub-2');
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Topic anatomy-general-anatomy does not belong to subject surgery');
  });

  it('rejects invalid provenance', () => {
    const q = createValidQuestion();
    (q as any).provenance = 'STOLEN_FROM_MARROW';
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Unsupported provenance: STOLEN_FROM_MARROW');
  });

  it('rejects duplicate external ID', () => {
    const q = createValidQuestion();
    q.importId = 'Q-EXISTS';
    const result = validateQuestionsData([q], subjectMap, topicMap, existingImportIds);
    expect(result.invalid).toBe(1);
    expect(result.report[0]).toContain('Duplicate external ID (importId: Q-EXISTS) exists in DB');
  });
});

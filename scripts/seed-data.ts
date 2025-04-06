import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.join(__dirname, '../japanese_learning.db');

// Connect to the database
const db = new Database(dbPath);

// Example sentences with translations
const exampleSentences = [
  {
    sentence: '私は日本語を勉強しています。',
    translation: 'I am studying Japanese.',
    difficultyLevel: 1,
    tags: 'beginner,JLPT N5,self-introduction',
    source: 'seed'
  },
  {
    sentence: '明日は友達と東京に行きます。',
    translation: 'Tomorrow I will go to Tokyo with my friend.',
    difficultyLevel: 1,
    tags: 'beginner,JLPT N5,travel',
    source: 'seed'
  },
  {
    sentence: '本を読むことが好きです。',
    translation: 'I like reading books.',
    difficultyLevel: 1,
    tags: 'beginner,JLPT N5,hobbies',
    source: 'seed'
  },
  {
    sentence: '昨日はレストランで美味しい料理を食べました。',
    translation: 'Yesterday I ate delicious food at a restaurant.',
    difficultyLevel: 2,
    tags: 'elementary,JLPT N4,food',
    source: 'seed'
  },
  {
    sentence: '日本に行ったことがありますか？',
    translation: 'Have you ever been to Japan?',
    difficultyLevel: 2,
    tags: 'elementary,JLPT N4,travel,question',
    source: 'seed'
  },
  {
    sentence: '電車が遅れたので、会議に遅刻しました。',
    translation: 'Because the train was delayed, I was late for the meeting.',
    difficultyLevel: 3,
    tags: 'intermediate,JLPT N3,business',
    source: 'seed'
  },
  {
    sentence: 'この映画を見た後で、レビューを書いてください。',
    translation: 'After watching this movie, please write a review.',
    difficultyLevel: 3,
    tags: 'intermediate,JLPT N3,entertainment',
    source: 'seed'
  },
  {
    sentence: '環境問題について話し合う必要があります。',
    translation: 'We need to discuss environmental issues.',
    difficultyLevel: 4,
    tags: 'advanced,JLPT N2,environment',
    source: 'seed'
  },
  {
    sentence: '日本の文化に興味を持ったきっかけは何ですか？',
    translation: 'What made you interested in Japanese culture?',
    difficultyLevel: 4,
    tags: 'advanced,JLPT N2,culture,question',
    source: 'seed'
  },
  {
    sentence: '現代社会においては、テクノロジーの進歩が私たちの生活を大きく変えています。',
    translation: 'In modern society, technological advances are greatly changing our lives.',
    difficultyLevel: 5,
    tags: 'native,JLPT N1,technology,society',
    source: 'seed'
  }
];

console.log('Seeding database with example sentences...');

// Prepare the statement
const insertStmt = db.prepare(`
  INSERT INTO sentences (sentence, translation, difficulty_level, tags, source, created_at, llm_processed)
  VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'), 0)
`);

// Begin transaction
const transaction = db.transaction(() => {
  for (const sentence of exampleSentences) {
    insertStmt.run(
      sentence.sentence,
      sentence.translation,
      sentence.difficultyLevel,
      sentence.tags,
      sentence.source
    );
  }
});

// Execute the transaction
try {
  transaction();
  console.log(`Successfully added ${exampleSentences.length} example sentences.`);
} catch (error) {
  console.error('Error seeding database:', error);
}

// Close the database connection
db.close(); 